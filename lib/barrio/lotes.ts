/**
 * lib/barrio/lotes.ts
 * Lógica de subdivisión de manzanas en lotes individuales.
 *
 * La fuente de verdad de posición/tamaño de cada manzana está en manzanas.ts.
 * Este módulo toma esos bounds y los divide según el layout de cada manzana.
 */

import type { ManzanaConfig } from "@/lib/barrio/manzanas";
export type { ManzanaLayout } from "@/lib/barrio/manzanas";

// ─── Resultado ───────────────────────────────────────────────────────────────

export interface LotePolygon {
    /** Número de lote dentro de la manzana (1-based) */
    numero: string;
    /** Fila dentro del layout (0-based) */
    fila: number;
    /** Columna dentro de la fila (0-based) */
    col: number;
    /** Vértices [NW, NE, SE, SW] en [lat, lng] */
    bounds: [number, number][];
    /** Centroide calculado */
    centro: [number, number];
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Divide el rectángulo de una manzana en N polígonos de lote.
 * - Manzanas con más de 18 lotes → 2 filas (espalda con espalda) por defecto.
 * - Manzanas con 18 o menos     → 1 fila.
 * El layout explícito en ManzanaConfig.layout sobreescribe el default.
 */
/**
 * Umbral a partir del cual se usan 2 filas automáticamente.
 * Manzanas con más de este número de lotes se muestran en 2 filas (espalda con espalda)
 * salvo que tengan un layout explícito definido.
 */
const UMBRAL_DOS_FILAS = 18;

export function calcularLotesPolygons(manzana: ManzanaConfig): LotePolygon[] {
    if (!manzana.cantidadLotes || manzana.tipo !== "manzana") return [];

    const [NW, NE, , SW] = manzana.bounds;
    const filasDefault = manzana.cantidadLotes > UMBRAL_DOS_FILAS ? 2 : 1;
    const filas = manzana.layout?.filas ?? filasDefault;
    const lotesPerFila = Math.ceil(manzana.cantidadLotes / filas);

    const latNW = NW[0];
    const lngNW = NW[1];
    const latSW = SW[0];
    const lngNE = NE[1];

    const totalHeight = latNW - latSW; // positivo (lat decrece hacia el sur)
    const totalWidth = lngNE - lngNW; // positivo

    const results: LotePolygon[] = [];
    let loteNum = manzana.loteInicio ?? 1;

    for (let f = 0; f < filas; f++) {
        const latTop = latNW - f * (totalHeight / filas);
        const latBot = latNW - (f + 1) * (totalHeight / filas);

        // La última fila toma los lotes restantes
        const lotesEstaFila =
            f === filas - 1
                ? manzana.cantidadLotes - f * lotesPerFila
                : lotesPerFila;

        for (let c = 0; c < lotesEstaFila; c++) {
            const lngL = lngNW + c * (totalWidth / lotesEstaFila);
            const lngR = lngNW + (c + 1) * (totalWidth / lotesEstaFila);

            results.push({
                numero: String(loteNum++),
                fila: f,
                col: c,
                bounds: [
                    [latTop, lngL],
                    [latTop, lngR],
                    [latBot, lngR],
                    [latBot, lngL],
                ],
                centro: [(latTop + latBot) / 2, (lngL + lngR) / 2],
            });
        }
    }

    return results;
}
