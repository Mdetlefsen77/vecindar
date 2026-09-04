import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarPushUsuario } from "@/lib/push/enviarPush";
import { montoDeSuscripcion, formatoPesos } from "@/lib/cobranza";

/**
 * GET /api/cron/recordatorios-cobranza
 *
 * Disparado por Vercel Cron (ver vercel.json) una vez por día. Push a cada
 * vecino no exento con la cuota por vencer o vencida:
 *  - 3 días antes de vencer (una vez).
 *  - El primer día que queda vencida.
 *  - Después, un recordatorio cada 7 días mientras siga vencida.
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

  const suscripciones = await prisma.suscripcion.findMany({
    where: { exento: false, vigenteHasta: { not: null } },
    select: {
      usuarioId: true,
      vigenteHasta: true,
      montoMensual: true,
      usuario: { select: { verificado: true } },
    },
  });

  let avisosPrevios = 0;
  let avisosVencida = 0;

  await Promise.all(
    suscripciones
      .filter((s) => s.usuario.verificado)
      .map(async (s) => {
        const cuota = formatoPesos(montoDeSuscripcion(s));
        const dias = diasEntre(ahora, s.vigenteHasta!);

        if (dias === 3) {
          avisosPrevios++;
          await enviarPushUsuario(s.usuarioId, {
            title: "Tu cuota vence en 3 días",
            body: `Cuota mensual: ${cuota}. Entrá a "Mi suscripción" para regularizarla a tiempo.`,
            url: "/mi-suscripcion",
            tag: "cobranza",
          });
          return;
        }

        const diasDeMora = -dias;
        if (diasDeMora === 1 || (diasDeMora > 0 && diasDeMora % 7 === 0)) {
          avisosVencida++;
          await enviarPushUsuario(s.usuarioId, {
            title: "Tu cuota está vencida",
            body: `Cuota mensual: ${cuota}. Entrá a "Mi suscripción" para ver cómo pagar.`,
            url: "/mi-suscripcion",
            tag: "cobranza",
          });
        }
      }),
  );

  return NextResponse.json({ ok: true, avisosPrevios, avisosVencida });
}
