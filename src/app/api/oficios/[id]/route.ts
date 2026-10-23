import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { esGestor, GESTORES_OFICIOS } from "@/lib/permisos";
import { oficioSchema } from "@/lib/validation/oficios";
import { enviarPushSoloAdmin } from "@/lib/push/enviarPush";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/oficios/[id] — el dueño edita su card. Si estaba rechazada,
// vuelve a revisión; si estaba publicada o pausada, mantiene su estado.
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const usuarioId = getUserId(guard.session);

  const id = parseId((await params).id);
  const oficio = id
    ? await prisma.oficio.findUnique({
        where: { id },
        select: { usuarioId: true, estado: true },
      })
    : null;
  if (!oficio || oficio.usuarioId !== usuarioId) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const parsed = oficioSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return respuestaValidacion(parsed.error);

  const categoria = await prisma.categoriaOficio.findFirst({
    where: { id: parsed.data.categoriaId, activa: true },
    select: { id: true },
  });
  if (!categoria) {
    return NextResponse.json({ error: "Rubro inválido." }, { status: 400 });
  }

  const reenviado = oficio.estado === "RECHAZADO";
  const actualizado = await prisma.oficio.update({
    where: { id: id! },
    data: {
      ...parsed.data,
      ...(reenviado ? { estado: "PENDIENTE", motivoEstado: null } : {}),
    },
    select: { id: true, titulo: true },
  });

  if (reenviado) {
    void enviarPushSoloAdmin({
      title: "Publicación corregida para revisar",
      body: `"${actualizado.titulo}" se volvió a enviar a revisión.`,
      url: "/admin/oficios",
      tag: "oficios-pendientes",
    });
  }

  return NextResponse.json({ id: actualizado.id });
}

// DELETE /api/oficios/[id] — el dueño (o un ADMIN) borra la card, con sus
// recomendaciones y reportes.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const id = parseId((await params).id);
  const oficio = id
    ? await prisma.oficio.findUnique({
        where: { id },
        select: { usuarioId: true },
      })
    : null;
  const puede =
    oficio &&
    (oficio.usuarioId === getUserId(session) ||
      esGestor(session.user.role, GESTORES_OFICIOS));
  if (!puede) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  await prisma.oficio.delete({ where: { id: id! } });
  return NextResponse.json({ ok: true });
}
