/**
 * lib/barrio/lotes.ts
 * Lógica de subdivisión de manzanas en lotes individuales.
 *
 * La fuente de verdad es el archivo parcelas.json (datos de agrimensores).
 * Cada lote tiene su polígono exacto derivado del levantamiento catastral.
 */

import { MANZANAS_CONFIG, type ManzanaConfig } from "@/lib/barrio/manzanas";
export type { ManzanaLayout } from "@/lib/barrio/manzanas";
import { getParcelasBounds } from "@/lib/barrio/data/geojson";

// ─── Resultado ───────────────────────────────────────────────────────────────

export interface LotePolygon {
  numero: string;
  /** @deprecated No se usa con datos GeoJSON. Se mantiene por compatibilidad. */
  fila: number;
  /** @deprecated No se usa con datos GeoJSON. Se mantiene por compatibilidad. */
  col: number;
  bounds: [number, number][];
  centro: [number, number];
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Devuelve los polígonos reales de cada lote de la manzana,
 * obtenidos directamente del levantamiento catastral (parcelas.json).
 */
export function calcularLotesPolygons(manzana: ManzanaConfig): LotePolygon[] {
  if (!manzana.cantidadLotes || manzana.tipo !== "manzana") return [];
  if (!manzana.loteInicio) return [];

  return getParcelasBounds(manzana.loteInicio, manzana.cantidadLotes).map(
    (p, i) => ({
      numero: p.numero,
      fila: 0,
      col: i,
      bounds: p.bounds,
      centro: p.centro,
    }),
  );
}

// ─── Búsqueda ─────────────────────────────────────────────────────────────────

/**
 * Ubica un lote por su número. La numeración es corrida en todo el barrio
 * (MZ 1 tiene del 1 al 25, MZ 2 del 26 al 59…), así que el número solo alcanza.
 */
export function ubicarLote(
  numero: string,
): { manzana: ManzanaConfig; lote: LotePolygon } | null {
  const n = parseInt(numero.trim(), 10);
  if (!Number.isFinite(n)) return null;
  const manzana = MANZANAS_CONFIG.find(
    (m) =>
      m.tipo === "manzana" &&
      m.loteInicio != null &&
      m.cantidadLotes != null &&
      n >= m.loteInicio &&
      n < m.loteInicio + m.cantidadLotes,
  );
  if (!manzana) return null;
  const lote = calcularLotesPolygons(manzana).find(
    (l) => l.numero === String(n),
  );
  return lote ? { manzana, lote } : null;
}

/** Link de Google Maps con el recorrido hasta un punto: abre la app en el celular. */
export function linkComoLlegar([lat, lng]: [number, number]): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
