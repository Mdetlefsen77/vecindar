import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, getUserId } from "@/lib/api/guard";
import { GESTORES_USUARIOS } from "@/lib/permisos";
import { registrarPagoSchema } from "@/lib/validation/cobranza";
import { recalcularVigencia } from "@/lib/cobranzaServer";

// POST /api/cobranza/pagos — registrar un pago (solo ADMIN)
// Body: { usuarioId, periodo "YYYY-MM", monto, metodo?, nota? }
export async function POST(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_USUARIOS);
  if (guard.response) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = registrarPagoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { usuarioId, periodo, monto, metodo, nota } = parsed.data;

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    return NextResponse.json(
      { error: "El usuario no existe." },
      { status: 404 },
    );
  }

  const yaExiste = await prisma.pago.findUnique({
    where: { usuarioId_periodo: { usuarioId, periodo } },
  });
  if (yaExiste) {
    return NextResponse.json(
      { error: `Ya hay un pago registrado para ${periodo}.` },
      { status: 409 },
    );
  }

  const pago = await prisma.pago.create({
    data: {
      usuarioId,
      periodo,
      monto,
      metodo: metodo ?? "TRANSFERENCIA",
      nota: nota || null,
      registradoPorId: getUserId(session),
    },
  });

  await recalcularVigencia(usuarioId);

  return NextResponse.json(pago, { status: 201 });
}
