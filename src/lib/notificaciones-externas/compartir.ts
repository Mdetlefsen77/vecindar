import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import type { CanalExterno, TipoEventoPublicacion } from "@/generated/enums";
import { crearLinkRastreable } from "./links";

export interface YaCompartido {
  publicadaPorId: number | null;
  publicadaPorNombre: string | null;
  creadaAt: Date;
  codigo: string | null;
}

export type ResultadoCompartir =
  | { ok: true; codigo: string; publicacionId: number }
  | { ok: false; yaCompartido: YaCompartido };

const SELECT_YA_COMPARTIDO = {
  publicadaPorId: true,
  creadaAt: true,
  publicadaPor: { select: { nombre: true, apellido: true } },
  link: { select: { codigo: true } },
} satisfies Prisma.PublicacionExternaSelect;

function aYaCompartido(row: {
  publicadaPorId: number | null;
  creadaAt: Date;
  publicadaPor: { nombre: string; apellido: string } | null;
  link: { codigo: string } | null;
}): YaCompartido {
  return {
    publicadaPorId: row.publicadaPorId,
    publicadaPorNombre: row.publicadaPor
      ? `${row.publicadaPor.nombre} ${row.publicadaPor.apellido}`
      : null,
    creadaAt: row.creadaAt,
    codigo: row.link?.codigo ?? null,
  };
}

/**
 * Estado actual de un evento respecto a si ya fue compartido — para que la
 * página de detalle lo muestre sin esperar a que alguien apriete el botón
 * (requirement "Un evento no se comparte dos veces").
 */
export async function obtenerCompartido(
  canal: CanalExterno,
  tipoEvento: TipoEventoPublicacion,
  entidadId: number,
): Promise<YaCompartido | null> {
  const row = await prisma.publicacionExterna.findUnique({
    where: { claveIdempotencia: `${canal}:${tipoEvento}:${entidadId}` },
    select: SELECT_YA_COMPARTIDO,
  });
  return row ? aYaCompartido(row) : null;
}

/**
 * Comparte un evento hacia un canal externo (HU-07 / CA-07.3-CA-07.4):
 * genera y persiste el link rastreable, y registra la publicación como
 * `MANUAL` / `ENVIADA` de una — no hay outbox ni despacho asincrónico en
 * Fase 1 (ver design.md, notificaciones-externas). Idempotente: un evento no
 * se comparte dos veces por el mismo canal (CA-01.4 / requirement "Un evento
 * no se comparte dos veces").
 */
export async function compartirEvento(args: {
  canal: CanalExterno;
  tipoEvento: TipoEventoPublicacion;
  entidadId: number;
  urlDestino: string;
  publicadaPorId: number;
}): Promise<ResultadoCompartir> {
  const claveIdempotencia = `${args.canal}:${args.tipoEvento}:${args.entidadId}`;

  const existente = await prisma.publicacionExterna.findUnique({
    where: { claveIdempotencia },
    select: SELECT_YA_COMPARTIDO,
  });
  if (existente) {
    return { ok: false, yaCompartido: aYaCompartido(existente) };
  }

  const link = await crearLinkRastreable(args.urlDestino);

  try {
    const publicacion = await prisma.publicacionExterna.create({
      data: {
        canal: args.canal,
        tipoEvento: args.tipoEvento,
        entidadId: args.entidadId,
        estado: "ENVIADA",
        claveIdempotencia,
        modo: "MANUAL",
        publicadaPorId: args.publicadaPorId,
        enviadaAt: new Date(),
        link: { connect: { id: link.id } },
      },
      select: { id: true },
    });
    return { ok: true, codigo: link.codigo, publicacionId: publicacion.id };
  } catch (err) {
    // Carrera: alguien más compartió el mismo evento entre el check y el
    // create (dos clicks casi simultáneos del botón). El link ya creado
    // queda huérfano (sin publicación asociada) — aceptable, no se limpia:
    // es un caso raro y el link huérfano no expone nada que la ruta real
    // no exponga ya.
    const esColisionDeClave =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("claveIdempotencia");
    if (esColisionDeClave) {
      const carrera = await prisma.publicacionExterna.findUniqueOrThrow({
        where: { claveIdempotencia },
        select: SELECT_YA_COMPARTIDO,
      });
      return { ok: false, yaCompartido: aYaCompartido(carrera) };
    }
    throw err;
  }
}
