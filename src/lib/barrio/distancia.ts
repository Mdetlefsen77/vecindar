/**
 * Distancia aproximada entre manzanas, para "cerca tuyo" en Oficios. Se mide
 * de centro a centro de manzana (nunca de lote: no se usa en qué casa vive
 * cada uno) y se expresa en cuadras, que es como se habla en el barrio.
 *
 * Importa los GeoJSON del barrio (~300 kB): usar solo desde el servidor.
 */
import { MANZANAS_CONFIG } from "@/lib/barrio/manzanas";

const METROS_POR_CUADRA = 100;

const centros = new Map<string, [number, number]>(
  MANZANAS_CONFIG.filter((m) => m.tipo === "manzana" && m.bounds.length).map(
    (m) => {
      const lat = m.bounds.reduce((s, p) => s + p[0], 0) / m.bounds.length;
      const lng = m.bounds.reduce((s, p) => s + p[1], 0) / m.bounds.length;
      return [m.numero, [lat, lng]];
    },
  ),
);

function metros([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  // Equirectangular: sobra para distancias de pocas cuadras.
  const rad = Math.PI / 180;
  const x = (lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/**
 * Cuadras entre dos manzanas: 0 si es la misma, al menos 1 si son distintas.
 * null si alguna no está en el mapa.
 */
export function cuadrasEntreManzanas(a: string, b: string): number | null {
  if (a === b) return 0;
  const ca = centros.get(a);
  const cb = centros.get(b);
  if (!ca || !cb) return null;
  return Math.max(1, Math.round(metros(ca, cb) / METROS_POR_CUADRA));
}
