import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { mpCheckoutSchema } from "@/lib/validation/cobranza";
import {
  periodoActual,
  periodoLabel,
  montoDeSuscripcion,
} from "@/lib/cobranza";
import {
  mpConfigurado,
  crearPreferenciaPago,
  crearPreapproval,
} from "@/lib/mercadopago";

// POST /api/cobranza/mp/checkout
// El propio vecino genera un link de pago de MercadoPago.
// Body: { tipo: "pago" | "preapproval", periodo?: "YYYY-MM" }
// Devuelve { url } — el cliente redirige a esa URL.
export async function POST(req: NextRequest) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;
  const { session } = guard;

  if (!mpConfigurado()) {
    return NextResponse.json(
      { error: "MercadoPago no está disponible por ahora." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = mpCheckoutSchema.safeParse(body);
  if (!parsed.success) return respuestaValidacion(parsed.error);

  const usuarioId = getUserId(session);

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { email: true, suscripcion: { select: { montoMensual: true, exento: true } } },
  });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario inexistente." }, { status: 404 });
  }
  if (usuario.suscripcion?.exento) {
    return NextResponse.json(
      { error: "Estás exento del pago de la cuota." },
      { status: 400 },
    );
  }

  const monto = montoDeSuscripcion(usuario.suscripcion);

  try {
    if (parsed.data.tipo === "preapproval") {
      const url = await crearPreapproval({
        usuarioId,
        monto,
        emailVecino: usuario.email,
      });
      return NextResponse.json({ url });
    }

    const periodo = parsed.data.periodo ?? periodoActual();

    const yaPago = await prisma.pago.findUnique({
      where: { usuarioId_periodo: { usuarioId, periodo } },
      select: { id: true },
    });
    if (yaPago) {
      return NextResponse.json(
        { error: `Ya hay un pago registrado para ${periodoLabel(periodo)}.` },
        { status: 409 },
      );
    }

    const url = await crearPreferenciaPago({
      usuarioId,
      periodo,
      periodoLabel: periodoLabel(periodo),
      monto,
      emailVecino: usuario.email,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Error creando checkout de MercadoPago:", err);
    return NextResponse.json(
      { error: "No se pudo generar el link de pago. Probá de nuevo en un rato." },
      { status: 502 },
    );
  }
}
