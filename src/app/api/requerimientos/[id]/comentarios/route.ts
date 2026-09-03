import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { crearComentarioSchema } from "@/lib/validation/requerimientos";
import { nombreCompleto } from "@/lib/usuarios";
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
  const numId = parseId(id);
  if (numId === null) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
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
    where: { id: numId },
  });

  if (!requerimiento) {
    return NextResponse.json(
      { error: "Requerimiento no encontrado." },
      { status: 404 },
    );
  }

  const comentario = await prisma.comentarioReq.create({
    data: {
      requerimientoId: numId,
      usuarioId: getUserId(session),
      texto: parsed.data.texto,
    },
    include: {
      usuario: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
  });

  // Avisar al dueño del requerimiento si le respondió otra persona
  if (requerimiento.usuarioId !== getUserId(session)) {
    void enviarPushUsuario(requerimiento.usuarioId, {
      title: "💬 Nueva respuesta a tu requerimiento",
      body: `${nombreCompleto(comentario.usuario)}: ${parsed.data.texto.slice(0, 120)}`,
      url: `/requerimientos/${id}`,
      tag: `requerimiento-${id}`,
    });
  }

  return NextResponse.json(comentario, { status: 201 });
}
