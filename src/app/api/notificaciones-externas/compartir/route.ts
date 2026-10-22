import { NextRequest, NextResponse } from "next/server";
import { requireRoleSession, getUserId } from "@/lib/api/guard";
import { COMPARTIDORES_EXTERNOS } from "@/lib/permisos";
import { prisma } from "@/lib/prisma/client";
import { compartirEvento } from "@/lib/notificaciones-externas/compartir";
import {
  plantillaIncidente,
  plantillaRequerimiento,
  plantillaMascota,
  plantillaOficio,
  type AutorPlantilla,
} from "@/lib/notificaciones-externas/plantillas";
import { compartirEventoSchema } from "@/lib/validation/notificacionesExternas";
import { mensajeParte } from "@/lib/partes";
import { textoPrecioPromo } from "@/lib/oficios";
import { textoVencimiento } from "@/lib/fechas";

async function resolverIncidente(entidadId: number) {
  const inc = await prisma.incidente.findUnique({
    where: { id: entidadId },
    select: {
      id: true,
      visibleVecinos: true,
      reportadoPor: {
        select: {
          nombre: true,
          apellido: true,
          ocultarNombreEnPublicacionExterna: true,
        },
      },
    },
  });
  if (!inc) return { error: "No encontrado." as const };
  // "No se ofrece compartir un incidente restringido" — requirement de
  // notificaciones-externas/spec.md.
  if (!inc.visibleVecinos) {
    return { error: "Este incidente no está visible para vecinos." as const };
  }
  return {
    urlDestino: `/incidentes/${inc.id}`,
    construirMensaje: (link: string) =>
      plantillaIncidente(inc.reportadoPor as AutorPlantilla, link),
  };
}

async function resolverRequerimiento(entidadId: number) {
  const req = await prisma.requerimiento.findUnique({
    where: { id: entidadId },
    select: {
      id: true,
      categoria: true,
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          ocultarNombreEnPublicacionExterna: true,
        },
      },
    },
  });
  if (!req) return { error: "No encontrado." as const };
  return {
    urlDestino: `/requerimientos/${req.id}`,
    construirMensaje: (link: string) =>
      plantillaRequerimiento(
        req.usuario as AutorPlantilla,
        req.categoria,
        link,
      ),
  };
}

async function resolverMascota(entidadId: number) {
  const m = await prisma.mascotaPerdida.findUnique({
    where: { id: entidadId },
    select: {
      id: true,
      tipo: true,
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          ocultarNombreEnPublicacionExterna: true,
        },
      },
    },
  });
  if (!m) return { error: "No encontrado." as const };
  return {
    urlDestino: `/mascotas/${m.id}`,
    construirMensaje: (link: string) =>
      plantillaMascota(m.usuario as AutorPlantilla, m.tipo, link),
  };
}

async function resolverParteTurno(entidadId: number) {
  const parte = await prisma.parteTurno.findUnique({
    where: { id: entidadId },
  });
  if (!parte) return { error: "No encontrado." as const };
  // A diferencia del resto, el parte es contenido pensado para el grupo:
  // el mensaje lleva el parte completo, no un teaser.
  return {
    urlDestino: `/partes/${parte.id}`,
    construirMensaje: (link: string) =>
      mensajeParte(
        { ...parte, cantidadFotos: parte.imagenes.length },
        link,
      ),
  };
}

async function resolverOficio(entidadId: number) {
  const oficio = await prisma.oficio.findUnique({
    where: { id: entidadId },
    select: {
      id: true,
      titulo: true,
      estado: true,
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          ocultarNombreEnPublicacionExterna: true,
        },
      },
      promo: {
        select: { titulo: true, precioAntes: true, precioAhora: true, venceAt: true },
      },
      _count: { select: { recomendaciones: true } },
    },
  });
  // Solo lo publicado: un oficio pendiente o pausado no se difunde.
  if (!oficio || oficio.estado !== "APROBADO") {
    return { error: "No encontrado." as const };
  }
  const promo =
    oficio.promo && oficio.promo.venceAt > new Date() ? oficio.promo : null;
  return {
    urlDestino: `/oficios/${oficio.id}`,
    construirMensaje: (link: string) =>
      plantillaOficio(
        oficio.usuario as AutorPlantilla,
        oficio.titulo,
        oficio._count.recomendaciones,
        link,
        promo && {
          titulo: promo.titulo,
          precio: textoPrecioPromo(promo),
          vencimiento: textoVencimiento(promo.venceAt),
        },
      ),
  };
}

const RESOLVERS = {
  INCIDENTE: resolverIncidente,
  REQUERIMIENTO: resolverRequerimiento,
  MASCOTA: resolverMascota,
  PARTE_TURNO: resolverParteTurno,
  OFICIO: resolverOficio,
} as const;

/**
 * Tipos que se comparten muchas veces (otro grupo, otro vecino, el dueño
 * promocionándose): se reutiliza el mismo link rastreable en lugar de
 * responder "ya compartido".
 */
const REUTILIZABLES = new Set(["PARTE_TURNO", "OFICIO"]);

// POST /api/notificaciones-externas/compartir — HU-07. Genera el link
// rastreable, arma el mensaje según la plantilla del tipo y registra la
// publicación como compartida. Idempotente: si el evento ya fue compartido
// por este canal, no crea nada nuevo (ver requirement "Un evento no se
// comparte dos veces").
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = compartirEventoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "tipoEvento y entidadId son obligatorios." },
      { status: 400 },
    );
  }
  const { tipoEvento, entidadId } = parsed.data;

  // Cualquier rol puede compartir (COMPARTIDORES_EXTERNOS); lo que se
  // restringe es qué evento, en cada resolver (ej. incidentes no visibles).
  const guard = await requireRoleSession(
    COMPARTIDORES_EXTERNOS,
    "No tenés permiso para compartir este tipo de evento.",
  );
  if (guard.response) return guard.response;
  const { session } = guard;

  const resuelto = await RESOLVERS[tipoEvento](entidadId);
  if ("error" in resuelto) {
    return NextResponse.json({ error: resuelto.error }, { status: 404 });
  }

  const resultado = await compartirEvento({
    canal: "WHATSAPP",
    tipoEvento,
    entidadId,
    urlDestino: resuelto.urlDestino,
    publicadaPorId: getUserId(session),
  });

  if (
    !resultado.ok &&
    REUTILIZABLES.has(tipoEvento) &&
    resultado.yaCompartido.codigo
  ) {
    const link = `${req.nextUrl.origin}/r/${resultado.yaCompartido.codigo}`;
    return NextResponse.json({
      ok: true,
      mensaje: resuelto.construirMensaje(link),
      codigo: resultado.yaCompartido.codigo,
    });
  }

  if (!resultado.ok) {
    return NextResponse.json(
      {
        ok: false,
        yaCompartido: {
          publicadaPorNombre: resultado.yaCompartido.publicadaPorNombre,
          creadaAt: resultado.yaCompartido.creadaAt,
          codigo: resultado.yaCompartido.codigo,
        },
      },
      { status: 200 },
    );
  }

  const link = `${req.nextUrl.origin}/r/${resultado.codigo}`;
  return NextResponse.json({
    ok: true,
    mensaje: resuelto.construirMensaje(link),
    codigo: resultado.codigo,
  });
}
