import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession } from "@/lib/api/guard";
import { GESTORES_COBRANZA } from "@/lib/permisos";
import { recalcularVigencia } from "@/lib/cobranzaServer";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/cobranza/pagos/[id] — borra un pago mal cargado (solo ADMIN)
// y recalcula la vigencia de la suscripción.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_COBRANZA);
  if (guard.response) return guard.response;

  const { id } = await params;
  const pagoId = parseInt(id, 10);
  if (Number.isNaN(pagoId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const pago = await prisma.pago.findUnique({ where: { id: pagoId } });
  if (!pago) {
    return NextResponse.json({ error: "El pago no existe." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pago.delete({ where: { id: pagoId } });
    await recalcularVigencia(pago.usuarioId, tx);
  });

  return NextResponse.json({ ok: true });
}
