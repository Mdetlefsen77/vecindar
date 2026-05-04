import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/incidentes/[id] ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const incidente = await prisma.incidente.findUnique({
    where: { id: parseInt(id) },
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
  });

  if (!incidente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Vecinos no pueden ver incidentes no visibles
  if (session.user.role === "VECINO" && !incidente.visibleVecinos) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(incidente);
}

// ── PATCH /api/incidentes/[id] ───────────────────────────────────────────────
// Body: { estado?, visibleVecinos?, prioridad? }  — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo administradores pueden modificar incidentes." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await req.json();
  const { estado, visibleVecinos, prioridad } = body;

  const estadosValidos = ["ACTIVO", "RESUELTO", "FALSA_ALARMA"];
  if (estado && !estadosValidos.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const prioridadesValidas = ["CRITICO", "ALTO", "MEDIO", "BAJO"];
  if (prioridad && !prioridadesValidas.includes(prioridad)) {
    return NextResponse.json({ error: "Prioridad inválida." }, { status: 400 });
  }

  const incidente = await prisma.incidente.update({
    where: { id: parseInt(id) },
    data: {
      ...(estado !== undefined ? { estado } : {}),
      ...(visibleVecinos !== undefined ? { visibleVecinos } : {}),
      ...(prioridad !== undefined ? { prioridad } : {}),
    },
  });

  return NextResponse.json(incidente);
}
