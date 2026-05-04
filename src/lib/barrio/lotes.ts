/**
 * lib/barrio/lotes.ts
 * Lógica de subdivisión de manzanas en lotes individuales.
 *
 * La fuente de verdad es el archivo parcelas.json (datos de agrimensores).
 * Cada lote tiene su polígono exacto derivado del levantamiento catastral.
 */

import type { ManzanaConfig } from "@/lib/barrio/manzanas";
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
