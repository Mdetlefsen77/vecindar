import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { GESTORES_OFICIOS } from "@/lib/permisos";
import { fotosAdminSchema } from "@/lib/validation/oficios";
import { enviarPushUsuario } from "@/lib/push/enviarPush";

type Params = { params: Promise<{ id: string }> };

// PUT /api/oficios/[id]/imagenes — el ADMIN cambia las fotos (o la portada)
// de una card sin tocar su estado, y le avisa al dueño por push.
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_OFICIOS);
  if (guard.response) return guard.response;

  const id = parseId((await params).id);
  const oficio = id
    ? await prisma.oficio.findUnique({
        where: { id },
        select: {
          titulo: true,
          usuarioId: true,
          usuario: { select: { _count: { select: { pushSubscriptions: true } } } },
        },
      })
    : null;
  if (!oficio) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const parsed = fotosAdminSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const { imagenes, aviso } = parsed.data;

  await prisma.oficio.update({ where: { id: id! }, data: { imagenes } });

  void enviarPushUsuario(oficio.usuarioId, {
    title: "Actualizamos las fotos de tu publicación",
    body: `"${oficio.titulo}": ${aviso}`,
    url: `/oficios/${id}`,
    tag: `oficio-fotos-${id}`,
  });

  return NextResponse.json({
    ok: true,
    conPush: oficio.usuario._count.pushSubscriptions > 0,
  });
}
