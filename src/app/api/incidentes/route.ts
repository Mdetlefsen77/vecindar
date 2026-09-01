import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { crearIncidenteSchema } from "@/lib/validation/incidentes";
import type { TipoIncidente } from "@/generated/enums";
import { enviarPushBroadcast } from "@/lib/push/enviarPush";

const TIPO_INCIDENTE_LABEL: Record<TipoIncidente, string> = {
  ROBO: "Robo",
  ROBO_TENTATIVA: "Intento de robo",
  SOSPECHOSO: "Movimiento sospechoso",
  VANDALISMO: "Vandalismo",
  OTRO: "Incidente",
};

// ── GET /api/incidentes ──────────────────────────────────────────────────────
// Query params: ?tipo=ROBO  ?estado=ACTIVO  ?dias=30  ?manzanaId=5
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? undefined;
  const estado = searchParams.get("estado") ?? undefined;
  const dias = parseInt(searchParams.get("dias") ?? "0") || 0;
  const manzanaId = searchParams.get("manzanaId") ?? undefined;

  const fechaDesde =
    dias > 0 ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000) : undefined;

  // Vecinos solo ven incidentes visibles
  const soloVisibles = session.user.role === "VECINO";

  const incidentes = await prisma.incidente.findMany({
    where: {
      ...(tipo ? { tipo: tipo as TipoIncidente } : {}),
      ...(estado ? { estado: estado as never } : {}),
      ...(fechaDesde ? { fechaHora: { gte: fechaDesde } } : {}),
      ...(manzanaId ? { lote: { manzanaId: parseInt(manzanaId) } } : {}),
      ...(soloVisibles ? { visibleVecinos: true } : {}),
    },
    include: {
      reportadoPor: {
        select: {
          nombre: true,
          apellido: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      lote: {
        select: { numero: true, manzana: { select: { numero: true } } },
      },
    },
    orderBy: { fechaHora: "desc" },
  });

  return NextResponse.json(incidentes);
}

// ── POST /api/incidentes ─────────────────────────────────────────────────────
// Body: { tipo, descripcion, latitud, longitud, ubicacionText?, loteId?, visibleVecinos?, imagenes? }
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const body = await req.json();
  const parsed = crearIncidenteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Tipo, descripción y ubicación son obligatorios." },
      { status: 400 },
    );
  }

  const {
    tipo,
    descripcion,
    latitud,
    longitud,
    ubicacionText,
    loteId,
    visibleVecinos,
    imagenes,
    prioridad,
  } = parsed.data;

  const incidente = await prisma.incidente.create({
    data: {
      tipo,
      descripcion,
      latitud,
      longitud,
      ubicacionText: ubicacionText ?? null,
      loteId: loteId ? parseInt(String(loteId), 10) : null,
      visibleVecinos: visibleVecinos ?? true,
      imagenes: imagenes ?? [],
      prioridad: prioridad ?? "MEDIO",
      reportadoPorId: getUserId(session),
    },
  });

  if (incidente.visibleVecinos) {
    void enviarPushBroadcast(
      {
        title: `⚠️ ${TIPO_INCIDENTE_LABEL[tipo]} reportado`,
        body: descripcion.slice(0, 120),
        url: `/incidentes/${incidente.id}`,
        tag: `incidente-${incidente.id}`,
      },
      getUserId(session),
    );
  }

  return NextResponse.json(incidente, { status: 201 });
}
