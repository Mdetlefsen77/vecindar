import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";

// POST /api/encuesta/posponer — el vecino toca "Ahora no". El usuario sale de
// la sesión y la fecha la pone el servidor.
export async function POST() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const usuarioId = getUserId(guard.session);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { encuestaPospuestaEn: new Date() },
  });

  return NextResponse.json({ ok: true });
}
