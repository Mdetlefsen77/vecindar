import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession } from "@/lib/api/guard";
import { crearComentarioSchema } from "@/lib/validation/requerimientos";
import { enviarPushUsuario } from "@/lib/push/enviarPush";

// ── POST /api/requerimientos/[id]/comentarios ────────────────────────────────
// Body: { texto }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const body = await req.json();
  const parsed = crearComentarioSchema.safeParse(body);

  if (!parsed.success) {
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
      texto: parsed.data.texto,
    },
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
    },
  });

  // Avisar al dueño del requerimiento si le respondió otra persona
  if (requerimiento.usuarioId !== parseInt(session.user.id!)) {
    void enviarPushUsuario(requerimiento.usuarioId, {
      title: "💬 Nueva respuesta a tu requerimiento",
      body: `${comentario.usuario.nombre}: ${parsed.data.texto.slice(0, 120)}`,
      url: `/requerimientos/${id}`,
      tag: `requerimiento-${id}`,
    });
  }

  return NextResponse.json(comentario, { status: 201 });
}
