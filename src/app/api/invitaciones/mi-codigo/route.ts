import { NextResponse } from "next/server";
import { requireSession, getUserId } from "@/lib/api/guard";
import { obtenerOCrearCodigo } from "@/lib/crecimiento/invitaciones";
import { prisma } from "@/lib/prisma/client";

// GET /api/invitaciones/mi-codigo — cualquier usuario autenticado.
// Devuelve el código de invitación propio (lo crea si es la primera vez) y
// cuántos vecinos se registraron a través de él.
export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const usuarioId = getUserId(guard.session);

  const [codigo, registros] = await Promise.all([
    obtenerOCrearCodigo(usuarioId),
    prisma.usuario.count({ where: { invitadoPorId: usuarioId } }),
  ]);

  return NextResponse.json({ codigo, registros });
}
