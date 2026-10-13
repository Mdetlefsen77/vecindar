import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarPushUsuario } from "@/lib/push/enviarPush";
import { montoDeSuscripcion, formatoPesos } from "@/lib/cobranza";
import {
  deudoresParaRecordar,
  enviarPushRecordatorio,
} from "@/lib/cobranzaServer";

/**
 * GET /api/cron/recordatorios-cobranza
 *
 * Disparado por Vercel Cron (ver vercel.json) una vez por día. Push a cada
 * vecino verificado no exento:
 *  - 3 días antes de vencer (una vez).
 *  - El primer día que queda vencida.
 *  - Después, un recordatorio cada 7 días mientras siga vencida.
 *  - Sin ningún pago registrado ("sin datos"): los días 1, 8, 15, 22 y 29 de
 *    cada mes. No tienen fecha de vencimiento propia, así que se usa una
 *    cadencia fija semanal.
 * Nunca toca `Suscripcion` — solo lee y notifica.
 */

const RE_BEARER = (secret: string) => `Bearer ${secret}`;

/** Medianoche local del día de `fecha` — para comparar por día, no por hora. */
function inicioDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Días de `a` a `b` (positivo si `b` es posterior), ignorando la hora. */
function diasEntre(a: Date, b: Date): number {
  return Math.round(
    (inicioDia(b).getTime() - inicioDia(a).getTime()) / 86_400_000,
  );
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== RE_BEARER(secret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const ahora = new Date();
  const tocaSinDatos = ahora.getDate() % 7 === 1;

  // Aviso previo: cuotas al día que vencen en 3 días.
  const porVencer = await prisma.suscripcion.findMany({
    where: {
      exento: false,
      vigenteHasta: { gte: ahora },
      usuario: { verificado: true },
    },
    select: { usuarioId: true, vigenteHasta: true, montoMensual: true },
  });
  const previos = porVencer.filter((s) => diasEntre(ahora, s.vigenteHasta!) === 3);

  const deudores = await deudoresParaRecordar(ahora);
  const vencidas = deudores.filter((d) => {
    if (d.estado !== "vencida") return false;
    const diasDeMora = -diasEntre(ahora, d.vigenteHasta!);
    return diasDeMora === 1 || (diasDeMora > 0 && diasDeMora % 7 === 0);
  });
  const sinDatos = tocaSinDatos
    ? deudores.filter((d) => d.estado === "sin_datos")
    : [];

  await Promise.all([
    ...previos.map((s) =>
      enviarPushUsuario(s.usuarioId, {
        title: "Tu aporte mensual vence en 3 días",
        body: `Aporte mensual: ${formatoPesos(montoDeSuscripcion(s))}. Entrá a "Mi suscripción" para regularizarla a tiempo.`,
        url: "/mi-suscripcion",
        tag: "cobranza",
      }),
    ),
    ...[...vencidas, ...sinDatos].map((d) =>
      enviarPushRecordatorio(d.usuarioId, d.estado, d.cuota),
    ),
  ]);

  return NextResponse.json({
    ok: true,
    avisosPrevios: previos.length,
    avisosVencida: vencidas.length,
    avisosSinDatos: sinDatos.length,
  });
}
