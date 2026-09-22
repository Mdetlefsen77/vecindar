import { prisma } from "@/lib/prisma/client";

const MINIMO_CASOS_MEDIANA_SOS = 5; // D8 de docs/proposal-reportes.md §15

/**
 * "Vecindar Wrapped" — resumen anual para compartir (docs/proposal-crecimiento.md
 * §1). Nivel DIFUSION siempre: nada identificable por caso, nada de nombres.
 *
 * VERSIÓN MÍNIMA — misma deuda técnica intencional que reciboDeValor.ts: sin
 * `ReporteModelo` (docs/proposal-reportes.md, todavía no implementado), este
 * módulo calcula agregados anuales directo contra la base, con las mismas
 * métricas ya confirmadas como 100% calculables hoy (auditoría de
 * proposal-reportes.md §2) y límites de año en offset fijo -03:00. Reemplazar
 * por `ReporteModelo` cuando exista — es el único punto que debería cambiar.
 */

export interface WrappedModelo {
  anio: number;
  incidentesResueltos: number;
  tiempoMedianoRespuestaSOSMin: number | null; // null = pocos casos, no se muestra (§7.6)
  coberturaLotesPct: number;
  manzanaMasActiva: { numero: string; zona: string; eventos: number } | null;
  vecinosParticipantes: number;
}

function limitesAnio(anio: number): { inicio: Date; fin: Date } {
  return {
    inicio: new Date(Date.UTC(anio, 0, 1, 3, 0, 0)),
    fin: new Date(Date.UTC(anio + 1, 0, 1, 3, 0, 0)),
  };
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 !== 0
    ? ordenados[mitad]!
    : (ordenados[mitad - 1]! + ordenados[mitad]!) / 2;
}

type ManzanaDe = { lote: { manzana: { numero: string; zona: string } } } | null;

function tallarManzanas(
  grupos: ManzanaDe[][],
): { numero: string; zona: string; eventos: number } | null {
  const conteo = new Map<string, { numero: string; zona: string; eventos: number }>();
  for (const grupo of grupos) {
    for (const item of grupo) {
      if (!item) continue;
      const { numero, zona } = item.lote.manzana;
      const clave = `${zona}-${numero}`;
      const actual = conteo.get(clave) ?? { numero, zona, eventos: 0 };
      actual.eventos += 1;
      conteo.set(clave, actual);
    }
  }
  let top: { numero: string; zona: string; eventos: number } | null = null;
  for (const entrada of conteo.values()) {
    if (!top || entrada.eventos > top.eventos) top = entrada;
  }
  return top;
}

export async function construirWrapped(anio: number): Promise<WrappedModelo> {
  const { inicio, fin } = limitesAnio(anio);
  const rango = { gte: inicio, lt: fin };

  const [
    incidentesResueltos,
    alertas,
    totalLotes,
    lotesOcupados,
    incidentesConManzana,
    requerimientosConManzana,
    mascotasConManzana,
    incidentesUsuarios,
    requerimientosUsuarios,
    mascotasUsuarios,
  ] = await Promise.all([
    prisma.incidente.count({ where: { createdAt: rango, estado: "RESUELTO" } }),
    prisma.alertaPanico.findMany({
      where: { createdAt: rango, recibidoAt: { not: null } },
      select: { createdAt: true, recibidoAt: true },
    }),
    prisma.lote.count(),
    prisma.lote.count({ where: { usuarios: { some: {} } } }),
    prisma.incidente.findMany({
      where: { createdAt: rango },
      select: {
        reportadoPor: {
          select: { lote: { select: { manzana: { select: { numero: true, zona: true } } } } },
        },
      },
    }),
    prisma.requerimiento.findMany({
      where: { createdAt: rango },
      select: {
        usuario: {
          select: { lote: { select: { manzana: { select: { numero: true, zona: true } } } } },
        },
      },
    }),
    prisma.mascotaPerdida.findMany({
      where: { createdAt: rango },
      select: {
        usuario: {
          select: { lote: { select: { manzana: { select: { numero: true, zona: true } } } } },
        },
      },
    }),
    prisma.incidente.findMany({
      where: { createdAt: rango },
      select: { reportadoPorId: true },
      distinct: ["reportadoPorId"],
    }),
    prisma.requerimiento.findMany({
      where: { createdAt: rango },
      select: { usuarioId: true },
      distinct: ["usuarioId"],
    }),
    prisma.mascotaPerdida.findMany({
      where: { createdAt: rango },
      select: { usuarioId: true },
      distinct: ["usuarioId"],
    }),
  ]);

  let tiempoMedianoRespuestaSOSMin: number | null = null;
  if (alertas.length >= MINIMO_CASOS_MEDIANA_SOS) {
    const minutos = alertas.map(
      (a) => (a.recibidoAt!.getTime() - a.createdAt.getTime()) / 60_000,
    );
    tiempoMedianoRespuestaSOSMin = Math.round(mediana(minutos));
  }

  const manzanaMasActiva = tallarManzanas([
    incidentesConManzana.map((i) => i.reportadoPor),
    requerimientosConManzana.map((r) => r.usuario),
    mascotasConManzana.map((m) => m.usuario),
  ]);

  const vecinosParticipantes = new Set([
    ...incidentesUsuarios.map((u) => u.reportadoPorId),
    ...requerimientosUsuarios.map((u) => u.usuarioId),
    ...mascotasUsuarios.map((u) => u.usuarioId),
  ]).size;

  return {
    anio,
    incidentesResueltos,
    tiempoMedianoRespuestaSOSMin,
    coberturaLotesPct:
      totalLotes > 0 ? Math.round((lotesOcupados / totalLotes) * 100) : 0,
    manzanaMasActiva,
    vecinosParticipantes,
  };
}
