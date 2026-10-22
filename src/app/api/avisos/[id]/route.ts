import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { esGestor, GESTORES_AVISOS } from "@/lib/permisos";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/avisos/[id] — el autor (o un gestor) lo borra.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const id = parseId((await params).id);
  const aviso = id
    ? await prisma.aviso.findUnique({ where: { id }, select: { autorId: true } })
    : null;
  const puede =
    aviso &&
    (aviso.autorId === getUserId(session) ||
      esGestor(session.user.role, GESTORES_AVISOS));
  if (!puede) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  await prisma.aviso.delete({ where: { id: id! } });
  return NextResponse.json({ ok: true });
}
