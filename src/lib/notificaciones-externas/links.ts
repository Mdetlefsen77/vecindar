import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";

// Mismo alfabeto que src/lib/crecimiento/invitaciones.ts — base62 sin
// caracteres ambiguos (sin 0/O, 1/I/l), porque este código también se
// comparte por WhatsApp/voz, no solo por link.
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const LARGO_CODIGO = 8;

/**
 * Cookie que deja `/r/[codigo]/ir` para atribuir `Usuario.origenRegistro`
 * si la persona termina registrándose (mismo patrón que COOKIE_INVITACION
 * en src/lib/crecimiento/invitaciones.ts). Sin el código en sí: alcanza con
 * saber que vino de un link externo, no de cuál evento.
 */
export const COOKIE_ORIGEN_WHATSAPP = "vecindar_origen_wa";

function generarCodigo(): string {
  const bytes = randomBytes(LARGO_CODIGO);
  let codigo = "";
  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO[bytes[i]! % ALFABETO.length];
  }
  return codigo;
}

/**
 * Crea un link rastreable para `urlDestino`. Se persiste antes de mostrarle
 * el link a quien comparte (CA-07.3) — nunca se genera el código y se
 * entrega sin guardar primero.
 */
export async function crearLinkRastreable(
  urlDestino: string,
): Promise<{ id: number; codigo: string }> {
  // Colisión es extremadamente improbable (62^8) pero se reintenta igual,
  // mismo criterio que obtenerOCrearCodigo() en crecimiento/invitaciones.ts.
  for (let intento = 0; intento < 5; intento++) {
    try {
      return await prisma.linkRastreable.create({
        data: { codigo: generarCodigo(), urlDestino },
        select: { id: true, codigo: true },
      });
    } catch (err) {
      const esColisionDeCodigo =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("codigo");
      if (!esColisionDeCodigo) throw err;
    }
  }
  throw new Error("No se pudo generar un link rastreable único.");
}

/** Resuelve un código a su destino. `null` si no existe. */
export async function resolverLink(
  codigo: string,
): Promise<{ id: number; urlDestino: string } | null> {
  return prisma.linkRastreable.findUnique({
    where: { codigo },
    select: { id: true, urlDestino: true },
  });
}

/**
 * Resuelve un código a los datos que necesita la vista previa (interstitial
 * con metatags OG, ver design.md): el tipo de evento, para elegir una
 * descripción genérica por tipo, nunca el destino ni contenido del evento.
 */
export async function resolverLinkParaVistaPrevia(
  codigo: string,
): Promise<{ tipoEvento: string | null } | null> {
  const row = await prisma.linkRastreable.findUnique({
    where: { codigo },
    select: { publicacion: { select: { tipoEvento: true } } },
  });
  if (!row) return null;
  return { tipoEvento: row.publicacion?.tipoEvento ?? null };
}

/**
 * Registra un click (CA de HU-06/notificaciones-externas): incrementa el
 * contador desnormalizado y deja una fila en `ClickLink` sin IP ni
 * user-agent completo — no hace falta para las métricas del PoC y agrega
 * superficie de datos personales sin necesidad.
 */
export async function registrarClickLink(
  linkId: number,
  args: { tenerSesion: boolean; usuarioId?: number },
): Promise<void> {
  await prisma.$transaction([
    prisma.linkRastreable.update({
      where: { id: linkId },
      data: { clicks: { increment: 1 } },
    }),
    prisma.clickLink.create({
      data: {
        linkId,
        tenerSesion: args.tenerSesion,
        usuarioId: args.usuarioId,
      },
    }),
  ]);
}
