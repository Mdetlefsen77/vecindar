import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// ── POST /api/requerimientos/[id]/comentarios ────────────────────────────────
// Body: { texto }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { texto } = await req.json();

  if (!texto?.trim()) {
    return NextResponse.json(
      { error: "El comentario no puede estar vacío." },
      { status: 400 },
    );
  }

  // Verificar que el requerimiento existe
  const requerimiento = await prisma.requerimiento.findUnique({
    where: { id: parseInt(id) },
  });

  if (!requerimiento) {
    return NextResponse.json(
      { error: "Requerimiento no encontrado." },
      { status: 404 },
    );
  }

  const comentario = await prisma.comentarioReq.create({
    data: {
      requerimientoId: parseInt(id),
      usuarioId: parseInt(session.user.id!),
      texto: texto.trim(),
    },
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
    },
  });

  return NextResponse.json(comentario, { status: 201 });
}
