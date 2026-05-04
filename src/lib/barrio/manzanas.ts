/**
 * CONFIGURACIÓN CENTRAL DEL BARRIO
 * Universitario de Horizonte III — Córdoba, Argentina
 *
 * Los bounds de cada manzana y parcela provienen de los archivos GeoJSON
 * levantados por agrimensores (fuente oficial).
 */

import {
  getManzanaBounds,
  getManzanaBoundsByFid,
} from "./data/geojson";

export const BARRIO_CENTER: [number, number] = [-31.495963, -64.277734];
export const BARRIO_ZOOM = 15;
export const BARRIO_ZOOM_MIN = 14;
export const BARRIO_ZOOM_MAX = 19;
export type Zona = "Norte" | "Sur";
export type TipoZona = "manzana" | "espacio_verde" | "uso_comunitario";
export interface ManzanaConfig {
  id: number;
  numero: string;
  zona: Zona;
  tipo: TipoZona;
  label?: string;
  bounds: [number, number][];
  cantidadLotes?: number;
  loteInicio?: number;
  layout?: ManzanaLayout;
}

export interface ManzanaLayout {
  filas: number;
}

/** Convierte el número de manzana interno a formato catastral (e.g. "5" → "005") */
function gj(n: string): [number, number][] {
  return getManzanaBounds(n.padStart(3, "0"));
}

export const MANZANAS_CONFIG: ManzanaConfig[] = [
  {
    id: 1,
    numero: "1",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("1"),
    cantidadLotes: 25,
    loteInicio: 1,
  },
  {
    id: 2,
    numero: "2",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("2"),
    cantidadLotes: 34,
    loteInicio: 26,
  },
  {
    id: 99,
    numero: "EV1",
    zona: "Norte",
    tipo: "espacio_verde",
    bounds: getManzanaBoundsByFid(5),
    label: "E.V.1",
  },

  // ─── Calle O ─────────────────────────────────────────────────────────
  {
    id: 3,
    numero: "3",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("3"),
    cantidadLotes: 28,
    loteInicio: 60,
  },
  {
    id: 4,
    numero: "4",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("4"),
    cantidadLotes: 38,
    loteInicio: 88,
  },

  // ─── Calle I ─────────────────────────────────────────────────────────
  {
    id: 98,
    numero: "EV2",
    zona: "Norte",
    tipo: "espacio_verde",
    bounds: getManzanaBoundsByFid(7),
    label: "E.V.2",
  },
  {
    id: 6,
    numero: "6",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("6"),
    cantidadLotes: 36,
    loteInicio: 162,
  },
  {
    id: 7,
    numero: "7",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("7"),
    cantidadLotes: 36,
    loteInicio: 198,
  },

  // ─── Calle Ñ / N ─────────────────────────────────────────────────────
  {
    id: 5,
    numero: "5",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("5"),
    cantidadLotes: 36,
    loteInicio: 126,
  },
  {
    id: 8,
    numero: "8",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("8"),
    cantidadLotes: 33,
    loteInicio: 234,
  },
  {
    id: 9,
    numero: "9",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("9"),
    cantidadLotes: 32,
    loteInicio: 267,
  },
  {
    id: 10,
    numero: "10",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("10"),
    cantidadLotes: 36,
    loteInicio: 299,
  },
  {
    id: 11,
    numero: "11",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("11"),
    cantidadLotes: 36,
    loteInicio: 335,
  },
  {
    id: 12,
    numero: "12",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("12"),
    cantidadLotes: 33,
    loteInicio: 371,
  },

  // ─── Calle H / M / L ─────────────────────────────────────────────────
  {
    id: 13,
    numero: "13",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("13"),
    cantidadLotes: 33,
    loteInicio: 404,
  },
  {
    id: 14,
    numero: "14",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("14"),
    cantidadLotes: 36,
    loteInicio: 437,
  },
  {
    id: 15,
    numero: "15",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("15"),
    cantidadLotes: 36,
    loteInicio: 473,
  },
  {
    id: 16,
    numero: "16",
    zona: "Norte",
    tipo: "manzana",
    bounds: gj("16"),
    cantidadLotes: 36,
    loteInicio: 509,
  },
  {
    id: 17,
    numero: "17",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("17"),
    cantidadLotes: 33,
    loteInicio: 545,
  },
  {
    id: 18,
    numero: "18",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("18"),
    cantidadLotes: 34,
    loteInicio: 578,
  },
  {
    id: 97,
    numero: "EV3",
    zona: "Sur",
    tipo: "espacio_verde",
    bounds: getManzanaBoundsByFid(21),
    label: "E.V.3",
  },
  {
    id: 19,
    numero: "19",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("19"),
    cantidadLotes: 18,
    loteInicio: 612,
  },
  {
    id: 20,
    numero: "20",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("20"),
    cantidadLotes: 18,
    loteInicio: 630,
  },
  {
    id: 21,
    numero: "21",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("21"),
    cantidadLotes: 33,
    loteInicio: 648,
  },

  // ─── Calle K / Q (zona Sur) ──────────────────────────────────────────
  {
    id: 22,
    numero: "22",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("22"),
    cantidadLotes: 37,
    loteInicio: 681,
  },
  {
    id: 23,
    numero: "23",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("23"),
    cantidadLotes: 20,
    loteInicio: 718,
  },
  {
    id: 24,
    numero: "24",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("24"),
    cantidadLotes: 22,
    loteInicio: 738,
  },
  {
    id: 25,
    numero: "25",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("25"),
    cantidadLotes: 26,
    loteInicio: 760,
  },
  {
    id: 26,
    numero: "26",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("26"),
    cantidadLotes: 24,
    loteInicio: 786,
  },
  {
    id: 27,
    numero: "27",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("27"),
    cantidadLotes: 34,
    loteInicio: 810,
  },
  {
    id: 96,
    numero: "EUC1",
    zona: "Sur",
    tipo: "uso_comunitario",
    bounds: getManzanaBoundsByFid(32),
    label: "E.U.C.1",
  },
  {
    id: 95,
    numero: "EV4",
    zona: "Sur",
    tipo: "espacio_verde",
    bounds: getManzanaBoundsByFid(28),
    label: "E.V.4",
  },
  {
    id: 94,
    numero: "EV5",
    zona: "Sur",
    tipo: "espacio_verde",
    bounds: getManzanaBoundsByFid(42),
    label: "E.V.5",
  },

  // ─── Calle G / F / B (borde sur) ─────────────────────────────────────
  {
    id: 93,
    numero: "EUC2",
    zona: "Sur",
    tipo: "uso_comunitario",
    bounds: getManzanaBoundsByFid(43),
    label: "E.U.C.2",
  },
  {
    id: 28,
    numero: "28",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("28"),
    cantidadLotes: 13,
    loteInicio: 844,
  },
  {
    id: 29,
    numero: "29",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("29"),
    cantidadLotes: 24,
    loteInicio: 857,
  },
  {
    id: 30,
    numero: "30",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("30"),
    cantidadLotes: 25,
    loteInicio: 881,
  },
  {
    id: 31,
    numero: "31",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("31"),
    cantidadLotes: 29,
    loteInicio: 906,
  },
  {
    id: 32,
    numero: "32",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("32"),
    cantidadLotes: 31,
    loteInicio: 935,
  },
  {
    id: 33,
    numero: "33",
    zona: "Sur",
    tipo: "manzana",
    bounds: gj("33"),
    cantidadLotes: 34,
    loteInicio: 966,
  },
  {
    id: 34,
    numero: "34",
    zona: "Sur",
    tipo: "manzana",
    bounds: getManzanaBoundsByFid(40),
    cantidadLotes: 16,
    loteInicio: 1000,
  },
  {
    id: 35,
    numero: "35",
    zona: "Sur",
    tipo: "manzana",
    bounds: getManzanaBoundsByFid(41),
    cantidadLotes: 20,
    loteInicio: 1016,
  },
  {
    id: 92,
    numero: "EV6",
    zona: "Sur",
    tipo: "espacio_verde",
    bounds: getManzanaBoundsByFid(33),
    label: "E.V.6",
  },
];

// Colores por estado de lote — estilo plano catastral
export const COLORES_LOTE = {
  //                 borde           relleno    opacidad  grosor borde
  desocupado: {
    color: "#9ca3af",
    fillColor: "#ffffff",
    fillOpacity: 0.82,
    weight: 0.8,
  },
  habitado: {
    color: "#15803d",
    fillColor: "#bbf7d0",
    fillOpacity: 0.7,
    weight: 1.2,
  },
  incidente: {
    color: "#dc2626",
    fillColor: "#fecaca",
    fillOpacity: 0.75,
    weight: 1.5,
  },
  sos_activo: {
    color: "#d97706",
    fillColor: "#fde68a",
    fillOpacity: 0.8,
    weight: 1.5,
  },
} as const;

// Colores por zona de manzana
export const COLORES_MANZANA: Record<
  string,
  { color: string; fillColor: string; fillOpacity: number; weight: number }
> = {
  Norte: {
    color: "#2563eb",
    fillColor: "#3b82f6",
    fillOpacity: 0.12,
    weight: 2,
  },
  Sur: { color: "#ea580c", fillColor: "#f97316", fillOpacity: 0.12, weight: 2 },
  espacio_verde: {
    color: "#16a34a",
    fillColor: "#22c55e",
    fillOpacity: 0.35,
    weight: 1.5,
  },
  uso_comunitario: {
    color: "#7c3aed",
    fillColor: "#a855f7",
    fillOpacity: 0.3,
    weight: 1.5,
  },
};
