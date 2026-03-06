import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { TipoIncidente } from "@prisma/client";

// ── GET /api/incidentes ──────────────────────────────────────────────────────
// Query params: ?tipo=ROBO  ?estado=ACTIVO  ?dias=30  ?manzanaId=5
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    tipo,
    descripcion,
    latitud,
    longitud,
    ubicacionText,
    loteId,
    visibleVecinos,
    imagenes,
  } = body;

  if (!tipo || !descripcion?.trim() || latitud == null || longitud == null) {
    return NextResponse.json(
      { error: "Tipo, descripción y ubicación son obligatorios." },
      { status: 400 },
    );
  }

  const incidente = await prisma.incidente.create({
    data: {
      tipo,
      descripcion: descripcion.trim(),
      latitud,
      longitud,
      ubicacionText: ubicacionText?.trim() ?? null,
      loteId: loteId ? parseInt(loteId) : null,
      visibleVecinos: visibleVecinos ?? true,
      imagenes: imagenes ?? [],
      reportadoPorId: parseInt(session.user.id!),
    },
  });

  return NextResponse.json(incidente, { status: 201 });
}
