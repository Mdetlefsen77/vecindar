import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession } from "@/lib/api/guard";
import { crearComentarioAlertaSchema } from "@/lib/validation/panico";
import { enviarPushAdmins, enviarPushUsuario } from "@/lib/push/enviarPush";

// ── POST /api/panico/[id]/comentarios ────────────────────────────────────────
// Body: { texto } — solo el dueño de la alerta o admin/seguridad
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const body = await req.json();
  const parsed = crearComentarioAlertaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "El mensaje no puede estar vacío." },
      { status: 400 },
    );
  }

  const alerta = await prisma.alertaPanico.findUnique({
    where: { id: parseInt(id) },
  });

  if (!alerta) {
    return NextResponse.json(
      { error: "Alerta no encontrada." },
      { status: 404 },
    );
  }

  const usuarioId = parseInt(session.user.id!);
  const esAdmin =
    session.user.role === "ADMIN" || session.user.role === "SEGURIDAD";
  const esDuenio = alerta.usuarioId === usuarioId;

  if (!esAdmin && !esDuenio) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const comentario = await prisma.comentarioAlerta.create({
    data: {
      alertaId: parseInt(id),
      usuarioId,
      texto: parsed.data.texto,
    },
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
    },
  });

  // Avisar al otro lado de la conversación
  if (esAdmin) {
    void enviarPushUsuario(alerta.usuarioId, {
      title: "💬 Mensaje del equipo de seguridad",
      body: parsed.data.texto.slice(0, 120),
      url: "/panico",
      tag: `sos-${id}`,
    });
  } else {
    void enviarPushAdmins({
      title: "💬 Respuesta en alerta SOS",
      body: `${comentario.usuario.nombre}: ${parsed.data.texto.slice(0, 120)}`,
      url: "/panico",
      tag: `sos-${id}`,
    });
  }

  return NextResponse.json(comentario, { status: 201 });
}
