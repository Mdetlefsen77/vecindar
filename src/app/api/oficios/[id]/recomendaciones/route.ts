import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { recomendacionSchema } from "@/lib/validation/oficios";
import { enviarPushUsuario } from "@/lib/push/enviarPush";
import { nombreCorto } from "@/lib/oficios";

type Params = { params: Promise<{ id: string }> };

// POST /api/oficios/[id]/recomendaciones — "Recomiendo". Una por vecino y por
// oficio, nunca el propio. Solo sobre oficios publicados.
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const autorId = getUserId(guard.session);

  const id = parseId((await params).id);
  const oficio = id
    ? await prisma.oficio.findUnique({
        where: { id },
        select: { estado: true, usuarioId: true, titulo: true },
      })
    : null;
  if (!oficio || oficio.estado !== "APROBADO") {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  if (oficio.usuarioId === autorId) {
    return NextResponse.json(
      { error: "No podés recomendarte a vos mismo." },
      { status: 400 },
    );
  }

  const parsed = recomendacionSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) return respuestaValidacion(parsed.error);

  try {
    await prisma.recomendacionOficio.create({
      data: { oficioId: id!, autorId, comentario: parsed.data.comentario },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya recomendaste este oficio." },
        { status: 409 },
      );
    }
    throw err;
  }

  const autor = await prisma.usuario.findUnique({
    where: { id: autorId },
    select: { nombre: true, apellido: true },
  });
  void enviarPushUsuario(oficio.usuarioId, {
    title: "¡Te recomendaron! 👏",
    body: `${autor ? nombreCorto(autor) : "Un vecino"} recomendó tu servicio "${oficio.titulo}".`,
    url: `/oficios/${id}`,
    tag: `oficio-recomendado-${id}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/oficios/[id]/recomendaciones — quitar la recomendación propia.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  const id = parseId((await params).id);
  if (!id) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  await prisma.recomendacionOficio.deleteMany({
    where: { oficioId: id, autorId: getUserId(guard.session) },
  });
  return NextResponse.json({ ok: true });
}
