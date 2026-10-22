import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { esGestor, GESTORES_OFICIOS } from "@/lib/permisos";
import { promoSchema } from "@/lib/validation/oficios";
import { DURACION_PROMO } from "@/lib/oficios";
import { habilitacionPromo } from "@/lib/promosServer";

type Params = { params: Promise<{ id: string }> };

// POST /api/oficios/[id]/promo — el dueño carga la promo de su oficio
// publicado. Una vigente por oficio; vence a las 24 h o a los 7 días.
export async function POST(req: NextRequest, { params }: Params) {
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
  if (oficio.estado !== "APROBADO") {
    return NextResponse.json(
      { error: "Podés cargar promos cuando tu oficio esté publicado." },
      { status: 400 },
    );
  }

  const ahora = new Date();
  const { puede } = await habilitacionPromo(usuarioId, ahora);
  if (!puede) {
    return NextResponse.json(
      { error: "Para cargar promos tenés que tener tu aporte al día." },
      { status: 403 },
    );
  }

  const parsed = promoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const datos = parsed.data;

  try {
    await prisma.$transaction([
      // Una vencida que el cron todavía no borró no bloquea la nueva.
      prisma.promoOficio.deleteMany({
        where: { oficioId: id!, venceAt: { lte: ahora } },
      }),
      prisma.promoOficio.create({
        data: {
          ...datos,
          oficioId: id!,
          venceAt: new Date(ahora.getTime() + DURACION_PROMO[datos.duracion].ms),
        },
      }),
    ]);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya tenés una promo vigente. Borrala para cargar otra." },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/oficios/[id]/promo — el dueño (o un ADMIN) la saca antes de que venza.
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

  await prisma.promoOficio.deleteMany({ where: { oficioId: id! } });
  return NextResponse.json({ ok: true });
}
