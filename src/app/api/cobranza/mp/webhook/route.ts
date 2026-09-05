import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { periodoActual } from "@/lib/cobranza";
import { recalcularVigencia } from "@/lib/cobranzaServer";
import {
  getPagoMP,
  getPreapprovalMP,
  parseExternalReference,
  validarFirmaWebhook,
} from "@/lib/mercadopago";

// POST /api/cobranza/mp/webhook — notificaciones de MercadoPago.
// Ruta pública (MercadoPago la llama sin sesión); se valida por firma HMAC.
// Siempre respondemos rápido: 200 cuando ya está procesado o no aplica, 5xx
// solo si algo falló y queremos que MercadoPago reintente.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => null);

  const tipo: string | undefined =
    body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? undefined;
  const dataId: string | null =
    url.searchParams.get("data.id") ??
    (body?.data?.id != null ? String(body.data.id) : null) ??
    url.searchParams.get("id");

  if (
    !validarFirmaWebhook({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  if (!dataId) return NextResponse.json({ ok: true });

  try {
    if (tipo === "payment") {
      await procesarPago(dataId);
    } else if (tipo === "subscription_preapproval" || tipo === "preapproval") {
      await procesarPreapproval(dataId);
    }
    // subscription_authorized_payment y demás: el pago concreto llega también
    // como type "payment", así que acá no hace falta hacer nada.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de MercadoPago:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

async function procesarPago(mpPaymentId: string): Promise<void> {
  const yaRegistrado = await prisma.pago.findUnique({
    where: { mpPaymentId },
    select: { id: true },
  });
  if (yaRegistrado) return; // reintento del webhook — ya lo teníamos

  const pago = await getPagoMP(mpPaymentId);
  if (pago.status !== "approved") return;

  const ref = parseExternalReference(pago.external_reference);
  const esRecurrente = ref?.tipo === "preapproval" || !!pago.preapproval_id;

  let usuarioId: number;
  let periodo: string;

  if (ref?.tipo === "pago") {
    usuarioId = ref.usuarioId;
    periodo = ref.periodo;
  } else if (esRecurrente && ref?.tipo === "preapproval") {
    usuarioId = ref.usuarioId;
    periodo = periodoActual(
      pago.date_approved ? new Date(pago.date_approved) : new Date(),
    );
  } else {
    return; // no sabemos a quién imputarlo
  }

  const monto = Math.round(pago.transaction_amount);

  try {
    await prisma.$transaction(async (tx) => {
      const existente = await tx.pago.findUnique({
        where: { usuarioId_periodo: { usuarioId, periodo } },
        select: { id: true, mpPaymentId: true },
      });

      if (existente) {
        if (!existente.mpPaymentId) {
          await tx.pago.update({
            where: { id: existente.id },
            data: { mpPaymentId, metodo: "MERCADOPAGO" },
          });
        }
      } else {
        await tx.pago.create({
          data: {
            usuarioId,
            periodo,
            monto,
            metodo: "MERCADOPAGO",
            registradoPorId: usuarioId,
            mpPaymentId,
            nota: "Pago por MercadoPago",
          },
        });
      }

      await recalcularVigencia(usuarioId, tx);
    });
  } catch (err) {
    // Carrera con otro webhook para el mismo pago/período — ya quedó registrado.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return;
    }
    throw err;
  }
}

async function procesarPreapproval(mpPreapprovalId: string): Promise<void> {
  const pre = await getPreapprovalMP(mpPreapprovalId);
  const ref = parseExternalReference(pre.external_reference);
  if (ref?.tipo !== "preapproval") return;

  await prisma.suscripcion.upsert({
    where: { usuarioId: ref.usuarioId },
    create: {
      usuarioId: ref.usuarioId,
      mpPreapprovalId: pre.id,
      mpPreapprovalEstado: pre.status,
    },
    update: { mpPreapprovalId: pre.id, mpPreapprovalEstado: pre.status },
  });
}
