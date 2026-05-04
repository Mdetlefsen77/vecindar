/**
 * Helpers para acceder a los datos GeoJSON del barrio Horizonte III.
 * Los archivos manzanas.json y parcelas.json son la fuente de verdad
 * oficial — datos levantados por agrimensores.
 */

import manzanasData from "./manzanas.json";
import parcelasData from "./parcelas.json";

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface GeoFeature {
    type: "Feature";
    properties: { fid: number; numero: string | number };
    geometry: { type: "Polygon"; coordinates: number[][][] };
}

interface GeoCollection {
    type: "FeatureCollection";
    features: GeoFeature[];
}

const manzanas = manzanasData as unknown as GeoCollection;
const parcelas = parcelasData as unknown as GeoCollection;

// ─── Conversión de coordenadas ────────────────────────────────────────────────

/** GeoJSON usa [lng, lat]; Leaflet usa [lat, lng] */
function toLatLng(coord: number[]): [number, number] {
    return [coord[1], coord[0]];
}

// ─── Manzanas ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el polígono de una manzana por su número oficial (e.g. "001").
 * Si hay duplicados (e.g. dos features "034") devuelve el primero.
 */
export function getManzanaBounds(numero: string): [number, number][] {
    const feat = manzanas.features.find(
        (f) => f.properties.numero === numero,
    );
    if (!feat) return [];
    return feat.geometry.coordinates[0].map(toLatLng);
}

/**
 * Devuelve el polígono de una manzana por su fid.
 * Útil para zonas especiales ("E VERDE", "E USO COMUNITARIO")
 * y para los dos features "034" que tienen distinto fid.
 */
export function getManzanaBoundsByFid(fid: number): [number, number][] {
    const feat = manzanas.features.find((f) => f.properties.fid === fid);
    if (!feat) return [];
    return feat.geometry.coordinates[0].map(toLatLng);
}

// ─── Parcelas ─────────────────────────────────────────────────────────────────

export interface ParcelaData {
    numero: string;
    bounds: [number, number][];
    centro: [number, number];
}

/**
 * Devuelve las parcelas de una manzana, identificadas por rango numérico.
 * @param loteInicio  Número del primer lote de la manzana.
 * @param cantidadLotes  Cantidad total de lotes en esa manzana.
 */
export function getParcelasBounds(
    loteInicio: number,
    cantidadLotes: number,
): ParcelaData[] {
    const fin = loteInicio + cantidadLotes;
    return parcelas.features
        .filter((f) => {
            const n = f.properties.numero as number;
            return n >= loteInicio && n < fin;
        })
        .sort(
            (a, b) =>
                (a.properties.numero as number) - (b.properties.numero as number),
        )
        .map((f) => {
            const ring = f.geometry.coordinates[0];
            const bounds = ring.map(toLatLng);
            // Centroide: promedio de los vértices sin el punto de cierre
            const pts = bounds.slice(0, -1);
            const centro: [number, number] = [
                pts.reduce((s, c) => s + c[0], 0) / pts.length,
                pts.reduce((s, c) => s + c[1], 0) / pts.length,
            ];
            return {
                numero: String(f.properties.numero as number),
                bounds,
                centro,
            };
        });
}
