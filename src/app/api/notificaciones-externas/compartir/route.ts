import { NextRequest, NextResponse } from "next/server";
import { requireRoleSession, getUserId } from "@/lib/api/guard";
import {
  GESTORES_INCIDENTES,
  GESTORES_REQUERIMIENTOS,
  GESTORES_MASCOTAS,
} from "@/lib/permisos";
import { prisma } from "@/lib/prisma/client";
import { compartirEvento } from "@/lib/notificaciones-externas/compartir";
import {
  plantillaIncidente,
  plantillaRequerimiento,
  plantillaMascota,
  type AutorPlantilla,
} from "@/lib/notificaciones-externas/plantillas";
import { compartirEventoSchema } from "@/lib/validation/notificacionesExternas";

// Config por tipo de evento: quién puede compartirlo (mismos GESTORES_* que
// ya gestionan esa entidad — sin rol nuevo, ver design.md decisión "Reutilizar
// los conjuntos de gestores existentes") y cómo resolver autor/destino/mensaje.
const CONFIG_POR_TIPO = {
  INCIDENTE: { gestores: GESTORES_INCIDENTES },
  REQUERIMIENTO: { gestores: GESTORES_REQUERIMIENTOS },
  MASCOTA: { gestores: GESTORES_MASCOTAS },
} as const;

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
      plantillaRequerimiento(req.usuario as AutorPlantilla, req.categoria, link),
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

const RESOLVERS = {
  INCIDENTE: resolverIncidente,
  REQUERIMIENTO: resolverRequerimiento,
  MASCOTA: resolverMascota,
} as const;

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

  const guard = await requireRoleSession(
    CONFIG_POR_TIPO[tipoEvento].gestores,
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
