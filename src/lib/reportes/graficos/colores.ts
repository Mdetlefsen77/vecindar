/**
 * Paleta categórica validada (skill `dataviz`, `references/palette.md`) —
 * orden fijo, nunca cíclico, nunca por ranking (§11 de la spec de reportes:
 * "color sigue a la entidad, nunca su rango"). Cada categoría de un módulo
 * (tipo de incidente, categoría de requerimiento) tiene un slot fijo, así
 * que "ROBO" es siempre el mismo color en cualquier gráfico del reporte.
 */
export const CATEGORICO_LIGHT = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

export const COLOR_SERIE_PRINCIPAL = CATEGORICO_LIGHT[0]; // sparkline / línea única
export const COLOR_TEXTO_SECUNDARIO = "#52514e";
export const COLOR_GRILLA = "#e5e5e0";
