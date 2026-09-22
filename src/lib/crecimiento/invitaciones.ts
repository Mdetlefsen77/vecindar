import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";

// Alfabeto base62 sin caracteres ambiguos al leerlos en voz alta o escritos a
// mano (sin 0/O, 1/I/l) — el código se comparte por WhatsApp/voz, no solo por link.
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const LARGO_CODIGO = 8;

/** Cookie donde `/i/[codigo]` guarda el código hasta que se complete el registro. */
export const COOKIE_INVITACION = "vecindar_invitacion";

function generarCodigo(): string {
  const bytes = randomBytes(LARGO_CODIGO);
  let codigo = "";
  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO[bytes[i]! % ALFABETO.length];
  }
  return codigo;
}

/**
 * Devuelve el código de invitación del usuario, creándolo si es la primera
 * vez que lo pide. Único de por vida (docs/proposal-crecimiento.md §4, C3) —
 * no hay forma de regenerarlo.
 */
export async function obtenerOCrearCodigo(usuarioId: number): Promise<string> {
  const existente = await prisma.codigoInvitacion.findUnique({
    where: { usuarioId },
    select: { codigo: true },
  });
  if (existente) return existente.codigo;

  // Colisión de código es extremadamente improbable (62^8 combinaciones) pero
  // se reintenta igual en vez de asumir que nunca va a pasar.
  for (let intento = 0; intento < 5; intento++) {
    try {
      const creado = await prisma.codigoInvitacion.create({
        data: { usuarioId, codigo: generarCodigo() },
        select: { codigo: true },
      });
      return creado.codigo;
    } catch (err) {
      const esColisionDeCodigo =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("codigo");
      if (!esColisionDeCodigo) throw err;
    }
  }
  throw new Error("No se pudo generar un código de invitación único.");
}

/** Resuelve un código a su dueño. `null` si no existe. */
export async function resolverCodigo(
  codigo: string,
): Promise<{ codigoId: number; usuarioId: number } | null> {
  const encontrado = await prisma.codigoInvitacion.findUnique({
    where: { codigo },
    select: { id: true, usuarioId: true },
  });
  if (!encontrado) return null;
  return { codigoId: encontrado.id, usuarioId: encontrado.usuarioId };
}

/** Incrementa el contador de clicks — best-effort, no bloquea la redirección. */
export async function registrarClick(codigoId: number): Promise<void> {
  await prisma.codigoInvitacion
    .update({ where: { id: codigoId }, data: { clicks: { increment: 1 } } })
    .catch(() => {});
}

/**
 * Atribuye un registro nuevo al código de invitación usado. Incrementa el
 * contador desnormalizado de `registros` — sin ningún efecto sobre cobranza
 * (sin incentivo monetario en este MVP, ver docs/proposal-crecimiento.md §5).
 */
export async function registrarConversion(codigoId: number): Promise<void> {
  await prisma.codigoInvitacion
    .update({ where: { id: codigoId }, data: { registros: { increment: 1 } } })
    .catch(() => {});
}
