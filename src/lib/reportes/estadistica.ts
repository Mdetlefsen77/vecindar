/**
 * Reglas de honestidad estadística con volumen bajo — §7.6 de la spec, D8 de
 * §15 (umbrales: 5 para variación/mediana, 10 para composición). Todo lo que
 * arma `metricas/*.ts` pasa por acá antes de llegar a un componente — así el
 * chequeo de umbral se hace una sola vez, no se repite en cada UI.
 */

export const UMBRAL_VARIACION_MEDIANA = 5;
export const UMBRAL_COMPOSICION = 10;

export type ValorEstadistico<T> =
  | { suficiente: true; valor: T }
  | { suficiente: false; motivo: "base-chica" | "sin-comparacion" };

export function suficiente<T>(valor: T): ValorEstadistico<T> {
  return { suficiente: true, valor };
}

export function insuficiente<T>(
  motivo: "base-chica" | "sin-comparacion" = "base-chica",
): ValorEstadistico<T> {
  return { suficiente: false, motivo };
}

/**
 * Variación de un conteo contra el período anterior — HU-04. Sin porcentaje
 * (solo diferencia absoluta) si la base es menor al umbral; "sin base de
 * comparación" si el período anterior no tiene datos, nunca 0%/infinito
 * (CA-04.3).
 */
export function variacion(
  actual: number,
  anterior: number,
  umbral: number = UMBRAL_VARIACION_MEDIANA,
): ValorEstadistico<{ abs: number; pct: number | null }> {
  const abs = actual - anterior;
  if (anterior === 0) {
    return actual === 0
      ? suficiente({ abs: 0, pct: null })
      : insuficiente("sin-comparacion");
  }
  if (anterior < umbral) return suficiente({ abs, pct: null });
  return suficiente({ abs, pct: Math.round((abs / anterior) * 1000) / 10 });
}

/** % de composición ("33% fueron robos") — solo si el total supera el umbral. */
export function composicion(
  parte: number,
  total: number,
  umbral: number = UMBRAL_COMPOSICION,
): ValorEstadistico<number> {
  if (total < umbral) return insuficiente("base-chica");
  return suficiente(Math.round((parte / total) * 1000) / 10);
}

function medianaDe(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 !== 0
    ? ordenados[mitad]!
    : (ordenados[mitad - 1]! + ordenados[mitad]!) / 2;
}

/**
 * Mediana (+ promedio secundario, D1) de una serie de tiempos — solo si hay
 * mínimo `umbral` casos. Por debajo, quien llama debe listar los valores
 * individuales en vez de resumirlos (§7.6) — este módulo no decide el
 * render, solo si el estadístico es sólido.
 */
export function medianaConMinimo(
  valores: number[],
  umbral: number = UMBRAL_VARIACION_MEDIANA,
): ValorEstadistico<{ mediana: number; promedio: number }> {
  if (valores.length < umbral) return insuficiente("base-chica");
  const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;
  return suficiente({
    mediana: medianaDe(valores),
    promedio: Math.round(promedio * 10) / 10,
  });
}

/** Percentil simple (0-100), usado para el p90 de tiempo de primera respuesta a SOS. */
export function percentil(valores: number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.ceil((p / 100) * ordenados.length) - 1;
  return ordenados[Math.max(0, Math.min(indice, ordenados.length - 1))]!;
}
