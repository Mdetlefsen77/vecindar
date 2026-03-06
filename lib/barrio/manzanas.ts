/**
 * CONFIGURACIÓN CENTRAL DEL BARRIO
 * Universitario de Horizonte III — Córdoba, Argentina
 */

// Centro fijo del barrio — el mapa siempre arranca aquí
export const BARRIO_CENTER: [number, number] = [-31.495963, -64.277734];

// Zoom inicial — 15 muestra el barrio completo; zoom in para detalle de lotes
export const BARRIO_ZOOM = 15;

// Zoom mínimo permitido (no alejarse demasiado)
export const BARRIO_ZOOM_MIN = 14;

// Zoom máximo (satélite/detalle de lote)
export const BARRIO_ZOOM_MAX = 19;

export type Zona = "Norte" | "Sur";

export type TipoZona = "manzana" | "espacio_verde" | "uso_comunitario";

export interface ManzanaConfig {
    id: number;           // coincide con Manzana.id en BD
    numero: string;       // "1" .. "35"
    zona: Zona;
    tipo: TipoZona;
    label?: string;       // para EV y EUC
    /** Polígono: array de [lat, lng] — vértices [NW, NE, SE, SW] */
    bounds: [number, number][];
    /** Número real de lotes según plano catastral */
    cantidadLotes?: number;
    /** Número del primer lote de la manzana según plano catastral (ej. MZ2 arranca en 26) */
    loteInicio?: number;
    /**
     * Layout de subdivisión interna en lotes.
     * Si se omite, se asume 1 fila distribuida uniformemente.
     */
    layout?: ManzanaLayout;
}

/**
 * Define cómo se subdivide internamente una manzana en lotes.
 * filas: 1 = fila simple, 2 = espalda con espalda.
 */
export interface ManzanaLayout {
    filas: number;
}

// Dimensiones de manzana calibradas para Horizonte III (~90m por cuadra)
const DLat = 0.00081;   // alto de una manzana
const DLng = 0.00095;   // ancho de una manzana

/** Rectángulo desde esquina NW: [NW, NE, SE, SW] */
function rect(
    latNW: number,
    lngNW: number,
    h: number = DLat,
    w: number = DLng,
): [number, number][] {
    return [
        [latNW, lngNW],
        [latNW, lngNW + w],
        [latNW - h, lngNW + w],
        [latNW - h, lngNW],
    ];
}

export const MANZANAS_CONFIG: ManzanaConfig[] = [
    // ─── Calle J (borde norte) ───────────────────────────────────────────
    { id: 1, numero: "1", zona: "Norte", tipo: "manzana", bounds: rect(-31.4927912, -64.2789231), cantidadLotes: 25, loteInicio: 1 },
    { id: 2, numero: "2", zona: "Norte", tipo: "manzana", bounds: rect(-31.4928198, -64.2773473), cantidadLotes: 34, loteInicio: 26 },
    { id: 99, numero: "EV1", zona: "Norte", tipo: "espacio_verde", bounds: rect(-31.4930588, -64.2759566), label: "E.V.1" },

    // ─── Calle O ─────────────────────────────────────────────────────────
    { id: 3, numero: "3", zona: "Norte", tipo: "manzana", bounds: rect(-31.4932989, -64.2789231), cantidadLotes: 28, loteInicio: 60 },
    { id: 4, numero: "4", zona: "Norte", tipo: "manzana", bounds: rect(-31.493297, -64.2773473), cantidadLotes: 38, loteInicio: 88 },

    // ─── Calle I ─────────────────────────────────────────────────────────
    { id: 98, numero: "EV2", zona: "Norte", tipo: "espacio_verde", bounds: rect(-31.4938261, -64.2789915), label: "E.V.2" },
    { id: 6, numero: "6", zona: "Norte", tipo: "manzana", bounds: rect(-31.4942835, -64.2790680), cantidadLotes: 36, loteInicio: 162 },
    { id: 7, numero: "7", zona: "Norte", tipo: "manzana", bounds: rect(-31.4948199, -64.2790680), cantidadLotes: 36, loteInicio: 198 },

    // ─── Calle Ñ / N ─────────────────────────────────────────────────────
    { id: 5, numero: "5", zona: "Norte", tipo: "manzana", bounds: rect(-31.4943430, -64.2801918), cantidadLotes: 36, loteInicio: 126 },
    { id: 8, numero: "8", zona: "Norte", tipo: "manzana", bounds: rect(-31.4942835, -64.2779441), cantidadLotes: 33, loteInicio: 234 },
    { id: 9, numero: "9", zona: "Norte", tipo: "manzana", bounds: rect(-31.4938261, -64.27687666), cantidadLotes: 32, loteInicio: 267 },
    { id: 10, numero: "10", zona: "Norte", tipo: "manzana", bounds: rect(-31.4942835, -64.27687666), cantidadLotes: 36, loteInicio: 299 },
    { id: 11, numero: "11", zona: "Norte", tipo: "manzana", bounds: rect(-31.4948199, -64.27687666), cantidadLotes: 36, loteInicio: 335 },
    { id: 12, numero: "12", zona: "Norte", tipo: "manzana", bounds: rect(-31.4942835, -64.275777), cantidadLotes: 33, loteInicio: 371 },

    // ─── Calle H / M / L ─────────────────────────────────────────────────
    { id: 13, numero: "13", zona: "Norte", tipo: "manzana", bounds: rect(-31.4956432, -64.2801918), cantidadLotes: 33, loteInicio: 404 },
    { id: 14, numero: "14", zona: "Norte", tipo: "manzana", bounds: rect(-31.495225, -64.2790680), cantidadLotes: 36, loteInicio: 437 },
    { id: 15, numero: "15", zona: "Norte", tipo: "manzana", bounds: rect(-31.4957473, -64.2790680), cantidadLotes: 36, loteInicio: 473 },
    { id: 16, numero: "16", zona: "Norte", tipo: "manzana", bounds: rect(-31.4962584, -64.2790680), cantidadLotes: 36, loteInicio: 509 },
    { id: 17, numero: "17", zona: "Sur", tipo: "manzana", bounds: rect(-31.4957473, -64.2779441), cantidadLotes: 33, loteInicio: 545 },
    { id: 18, numero: "18", zona: "Sur", tipo: "manzana", bounds: rect(-31.495225, -64.27687666), cantidadLotes: 34, loteInicio: 578 },
    { id: 97, numero: "EV3", zona: "Sur", tipo: "espacio_verde", bounds: rect(-31.4957473, -64.277145), label: "E.V.3" },
    { id: 19, numero: "19", zona: "Sur", tipo: "manzana", bounds: rect(-31.4962584, -64.277145), cantidadLotes: 18, loteInicio: 612 },
    { id: 20, numero: "20", zona: "Sur", tipo: "manzana", bounds: rect(-31.496000, -64.276406), cantidadLotes: 18, loteInicio: 630 },
    { id: 21, numero: "21", zona: "Sur", tipo: "manzana", bounds: rect(-31.4957473, -64.275777), cantidadLotes: 33, loteInicio: 648 },

    // ─── Calle K / Q (zona Sur) ──────────────────────────────────────────
    { id: 22, numero: "22", zona: "Sur", tipo: "manzana", bounds: rect(-31.4971732, -64.2802280), cantidadLotes: 37, loteInicio: 681 },
    { id: 23, numero: "23", zona: "Sur", tipo: "manzana", bounds: rect(-31.4967136, -64.2793496), cantidadLotes: 20, loteInicio: 718 },
    { id: 24, numero: "24", zona: "Sur", tipo: "manzana", bounds: rect(-31.4971732, -64.2793496), cantidadLotes: 22, loteInicio: 738 },
    { id: 25, numero: "25", zona: "Sur", tipo: "manzana", bounds: rect(-31.496997, -64.2785454487945), cantidadLotes: 26, loteInicio: 760 },
    { id: 26, numero: "26", zona: "Sur", tipo: "manzana", bounds: rect(-31.4967479, -64.2776960), cantidadLotes: 24, loteInicio: 786 },
    { id: 27, numero: "27", zona: "Sur", tipo: "manzana", bounds: rect(-31.4967479, -64.276406), cantidadLotes: 34, loteInicio: 810 },
    { id: 96, numero: "EUC1", zona: "Sur", tipo: "uso_comunitario", bounds: rect(-31.4971732, -64.277570), label: "E.U.C.1" },
    { id: 95, numero: "EV4", zona: "Sur", tipo: "espacio_verde", bounds: rect(-31.497610, -64.2793496), label: "E.V.4" },
    { id: 94, numero: "EV5", zona: "Sur", tipo: "espacio_verde", bounds: rect(-31.497512, -64.27606975150779), label: "E.V.5" },

    // ─── Calle G / F / B (borde sur) ─────────────────────────────────────
    { id: 93, numero: "EUC2", zona: "Sur", tipo: "uso_comunitario", bounds: rect(-31.498141, -64.279391), label: "E.U.C.2" },
    { id: 28, numero: "28", zona: "Sur", tipo: "manzana", bounds: rect(-31.4984666, -64.2802280), cantidadLotes: 13, loteInicio: 844 },
    { id: 29, numero: "29", zona: "Sur", tipo: "manzana", bounds: rect(-31.498543, -64.279391), cantidadLotes: 24, loteInicio: 857 },
    { id: 30, numero: "30", zona: "Sur", tipo: "manzana", bounds: rect(-31.498201646757536, -64.2785454487945), cantidadLotes: 25, loteInicio: 881 },
    { id: 31, numero: "31", zona: "Sur", tipo: "manzana", bounds: rect(-31.498201646757536, -64.27793658738442), cantidadLotes: 29, loteInicio: 906 },
    { id: 32, numero: "32", zona: "Sur", tipo: "manzana", bounds: rect(-31.498201646757536, -64.27736325943941), cantidadLotes: 31, loteInicio: 935 },
    { id: 33, numero: "33", zona: "Sur", tipo: "manzana", bounds: rect(-31.498201646757536, -64.27680565664706), cantidadLotes: 34, loteInicio: 966 },
    { id: 34, numero: "34", zona: "Sur", tipo: "manzana", bounds: rect(-31.498055482756985, -64.27606975150779), cantidadLotes: 16, loteInicio: 1000 },
    { id: 35, numero: "35", zona: "Sur", tipo: "manzana", bounds: rect(-31.498524457386107, -64.27606975150779), cantidadLotes: 20, loteInicio: 1016 },
    { id: 92, numero: "EV6", zona: "Sur", tipo: "espacio_verde", bounds: rect(-31.499000, -64.27793658738442), label: "E.V.6" },
];

// Colores por estado de lote — estilo plano catastral
export const COLORES_LOTE = {
    //                 borde           relleno    opacidad  grosor borde
    desocupado: { color: "#9ca3af", fillColor: "#ffffff", fillOpacity: 0.82, weight: 0.8 },
    habitado: { color: "#15803d", fillColor: "#bbf7d0", fillOpacity: 0.70, weight: 1.2 },
    incidente: { color: "#dc2626", fillColor: "#fecaca", fillOpacity: 0.75, weight: 1.5 },
    sos_activo: { color: "#d97706", fillColor: "#fde68a", fillOpacity: 0.80, weight: 1.5 },
} as const;

// Colores por zona de manzana
export const COLORES_MANZANA: Record<string, { color: string; fillColor: string; fillOpacity: number; weight: number }> = {
    Norte: { color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 2 },
    Sur: { color: "#ea580c", fillColor: "#f97316", fillOpacity: 0.12, weight: 2 },
    espacio_verde: { color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.35, weight: 1.5 },
    uso_comunitario: { color: "#7c3aed", fillColor: "#a855f7", fillOpacity: 0.30, weight: 1.5 },
};
