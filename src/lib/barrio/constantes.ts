/**
 * Constantes livianas del mapa del barrio. Viven aparte de manzanas.ts a
 * propósito: ese módulo importa los GeoJSON de agrimensores (~300 kB), y las
 * pantallas que solo necesitan centrar un mapa (nuevo incidente, lista de
 * incidentes) no deben cargarlos.
 */
export const BARRIO_CENTER: [number, number] = [-31.495963, -64.277734];
export const BARRIO_ZOOM = 15;
export const BARRIO_ZOOM_MIN = 14;
export const BARRIO_ZOOM_MAX = 19;

/**
 * Mosaicos de OpenStreetMap. Un solo host (sin los subdominios a/b/c, que OSM
 * ya no recomienda): con HTTP/2 una conexión alcanza, y permite hacerle
 * `preconnect` antes de que Leaflet cargue.
 */
export const OSM_TILE_ORIGIN = "https://tile.openstreetmap.org";
export const OSM_TILE_URL = `${OSM_TILE_ORIGIN}/{z}/{x}/{y}.png`;

/**
 * URL del mosaico que contiene el centro del barrio al zoom inicial. Los
 * mapas abren siempre ahí, así que se puede precargar (`preload`) en paralelo
 * con Leaflet en vez de esperar a que Leaflet lo pida: suele ser el elemento
 * más grande de la pantalla (LCP).
 */
export function mosaicoCentralUrl(
  [lat, lng]: [number, number] = BARRIO_CENTER,
  zoom = BARRIO_ZOOM,
): string {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return `${OSM_TILE_ORIGIN}/${zoom}/${x}/${y}.png`;
}
