import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { oficioSchema } from "@/lib/validation/oficios";
import { MAX_OFICIOS_POR_USUARIO } from "@/lib/oficios";
import { enviarPushSoloAdmin } from "@/lib/push/enviarPush";

// POST /api/oficios — un vecino publica su oficio. Queda PENDIENTE hasta que
// un ADMIN lo apruebe (se avisa por push a los admins).
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const usuarioId = getUserId(guard.session);

  const parsed = oficioSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return respuestaValidacion(parsed.error);

  const [activos, categoria] = await Promise.all([
    prisma.oficio.count({
      where: { usuarioId, estado: { not: "RECHAZADO" } },
    }),
    prisma.categoriaOficio.findFirst({
      where: { id: parsed.data.categoriaId, activa: true },
      select: { id: true },
    }),
  ]);
  if (activos >= MAX_OFICIOS_POR_USUARIO) {
    return NextResponse.json(
      { error: `Podés publicar hasta ${MAX_OFICIOS_POR_USUARIO} oficios o servicios.` },
      { status: 409 },
    );
  }
  if (!categoria) {
    return NextResponse.json({ error: "Rubro inválido." }, { status: 400 });
  }

  const oficio = await prisma.oficio.create({
    data: { ...parsed.data, usuarioId },
    select: { id: true, titulo: true },
  });

  void enviarPushSoloAdmin({
    title: "Nuevo oficio o servicio para revisar",
    body: `"${oficio.titulo}" espera aprobación para aparecer en el catálogo.`,
    url: "/admin/oficios",
    tag: "oficios-pendientes",
  });

  return NextResponse.json({ id: oficio.id }, { status: 201 });
}
