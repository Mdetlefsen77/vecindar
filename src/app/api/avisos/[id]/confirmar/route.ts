import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { confirmacionAvisoSchema } from "@/lib/validation/avisos";
import { avisoVigente, VOTOS_PARA_RESOLVER } from "@/lib/avisos";

type Params = { params: Promise<{ id: string }> };

// POST /api/avisos/[id]/confirmar — "Sigue pasando" / "Ya se resolvió".
// El autor que marca "resuelto" lo cierra en el momento; del resto hacen
// falta VOTOS_PARA_RESOLVER. Devuelve si quedó resuelto.
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const usuarioId = getUserId(guard.session);

  const id = parseId((await params).id);
  const aviso = id
    ? await prisma.aviso.findFirst({
        where: { id, ...avisoVigente() },
        select: { autorId: true },
      })
    : null;
  if (!aviso) {
    return NextResponse.json(
      { error: "Este aviso ya no está vigente." },
      { status: 404 },
    );
  }

  const parsed = confirmacionAvisoSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const { tipo } = parsed.data;

  if (aviso.autorId === usuarioId) {
    if (tipo === "RESUELTO") {
      await prisma.aviso.update({
        where: { id: id! },
        data: { resueltoAt: new Date() },
      });
      return NextResponse.json({ ok: true, resuelto: true });
    }
    return NextResponse.json(
      { error: "Es tu aviso: si sigue pasando, no hace falta confirmarlo." },
      { status: 400 },
    );
  }

  await prisma.confirmacionAviso.upsert({
    where: { avisoId_usuarioId: { avisoId: id!, usuarioId } },
    create: { avisoId: id!, usuarioId, tipo },
    update: { tipo },
  });

  const resueltos = await prisma.confirmacionAviso.count({
    where: { avisoId: id!, tipo: "RESUELTO" },
  });
  if (resueltos >= VOTOS_PARA_RESOLVER) {
    await prisma.aviso.update({
      where: { id: id! },
      data: { resueltoAt: new Date() },
    });
    return NextResponse.json({ ok: true, resuelto: true });
  }
  return NextResponse.json({ ok: true, resuelto: false });
}
