import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/requerimientos/[id] ─────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const requerimiento = await prisma.requerimiento.findUnique({
    where: { id: parseInt(id) },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      comentarios: {
        include: {
          usuario: { select: { id: true, nombre: true, rol: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!requerimiento) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(requerimiento);
}

// ── PATCH /api/requerimientos/[id] ───────────────────────────────────────────
// Body: { estado?, prioridad? }  — solo ADMIN puede cambiar estado o prioridad
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo administradores pueden cambiar el estado." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const { estado, prioridad } = await req.json();

  const estadosValidos = ["NUEVO", "EN_PROGRESO", "RESUELTO", "CERRADO"];
  if (estado && !estadosValidos.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const prioridadesValidas = ["CRITICO", "ALTO", "MEDIO", "BAJO"];
  if (prioridad && !prioridadesValidas.includes(prioridad)) {
    return NextResponse.json({ error: "Prioridad inválida." }, { status: 400 });
  }

  if (!estado && !prioridad) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const requerimiento = await prisma.requerimiento.update({
    where: { id: parseInt(id) },
    data: {
      ...(estado !== undefined ? { estado } : {}),
      ...(prioridad !== undefined ? { prioridad } : {}),
    },
  });

  return NextResponse.json(requerimiento);
}
