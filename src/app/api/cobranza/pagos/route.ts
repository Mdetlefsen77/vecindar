import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireRoleSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { GESTORES_COBRANZA } from "@/lib/permisos";
import { registrarPagoSchema } from "@/lib/validation/cobranza";
import { recalcularVigencia } from "@/lib/cobranzaServer";

// POST /api/cobranza/pagos — registrar un pago (solo ADMIN)
// Body: { usuarioId, periodo "YYYY-MM", monto, metodo?, nota? }
export async function POST(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_COBRANZA);
  if (guard.response) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = registrarPagoSchema.safeParse(body);
  if (!parsed.success) {
    return respuestaValidacion(parsed.error);
  }

  const { usuarioId, periodo, monto, metodo, nota } = parsed.data;

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    return NextResponse.json(
      { error: "El usuario no existe." },
      { status: 404 },
    );
  }

  // Crear el pago y recalcular la vigencia de forma atómica. El índice único
  // (usuarioId, periodo) es la barrera real contra duplicados si dos requests
  // entran a la vez: el segundo choca con P2002 y lo devolvemos como 409.
  try {
    const pago = await prisma.$transaction(async (tx) => {
      const creado = await tx.pago.create({
        data: {
          usuarioId,
          periodo,
          monto,
          metodo: metodo ?? "TRANSFERENCIA",
          nota: nota || null,
          registradoPorId: getUserId(session),
        },
      });
      await recalcularVigencia(usuarioId, tx);
      return creado;
    });

    return NextResponse.json(pago, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: `Ya hay un pago registrado para ${periodo}.` },
        { status: 409 },
      );
    }
    throw err;
  }
}
