import { prisma } from "@/lib/prisma/client";
import type { Periodo } from "../periodo";
import { medianaConMinimo, percentil, composicion } from "../estadistica";
import type { SeccionPanico } from "../tipos";

const UMBRAL_RESPUESTA_RAPIDA_MIN = 3; // sugerido por la spec §5.2, configurable acá

function minutos(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 60_000;
}

/** Cantidad de alertas disparadas en el período — reutilizado por el resumen ejecutivo. */
export async function contarAlertas(p: Periodo): Promise<number> {
  return prisma.alertaPanico.count({
    where: { createdAt: { gte: p.inicio, lt: p.fin } },
  });
}

export async function calcularPanico(p: Periodo): Promise<SeccionPanico> {
  const [disparadas, alertas, sinCerrar] = await Promise.all([
    contarAlertas(p),
    prisma.alertaPanico.findMany({
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      select: { createdAt: true, recibidoAt: true, cerradoAt: true },
    }),
    prisma.alertaPanico.count({
      where: {
        createdAt: { gte: p.inicio, lt: p.fin },
        estado: { not: "CERRADO" },
      },
    }),
  ]);

  const tiemposRespuesta = alertas
    .filter((a) => a.recibidoAt)
    .map((a) => minutos(a.createdAt, a.recibidoAt!));
  const tiemposCierre = alertas
    .filter((a) => a.cerradoAt)
    .map((a) => minutos(a.createdAt, a.cerradoAt!));

  const bajoUmbral = tiemposRespuesta.filter(
    (m) => m < UMBRAL_RESPUESTA_RAPIDA_MIN,
  ).length;

  return {
    disparadas,
    tiempoPrimeraRespuestaMin: medianaConMinimo(tiemposRespuesta),
    tiempoPrimeraRespuestaP90Min:
      tiemposRespuesta.length > 0
        ? Math.round(percentil(tiemposRespuesta, 90))
        : null,
    tiempoHastaCierreMin: medianaConMinimo(tiemposCierre),
    pctBajoUmbral: composicion(bajoUmbral, tiemposRespuesta.length),
    sinCerrar,
  };
}
