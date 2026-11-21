import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { encuestaSchema } from "@/lib/validation/encuesta";
import { rondaActual } from "@/lib/encuesta";

// POST /api/encuesta — el vecino responde la encuesta de experiencia. El
// usuario sale de la sesión y la ronda la calcula el servidor.
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const usuarioId = getUserId(guard.session);

  const parsed = encuestaSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return respuestaValidacion(parsed.error);

  await prisma.respuestaEncuesta.create({
    data: { usuarioId, ronda: rondaActual(), ...parsed.data },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
