import { prisma } from "@/lib/prisma/client";
import { MANZANAS_CONFIG } from "@/lib/barrio/manzanas";

/** Ray casting estándar — funciona igual para pares [lat, lng] que para [x, y]. */
function puntoEnPoligono(
  punto: [number, number],
  poligono: [number, number][],
): boolean {
  const [x, y] = punto;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]!;
    const [xj, yj] = poligono[j]!;
    const interseca =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (interseca) dentro = !dentro;
  }
  return dentro;
}

/**
 * Resuelve el `id` de `Manzana` para un incidente — docs/proposal-reportes.md
 * R9. Prioriza `loteId` (exacto, sin cálculo geométrico) y solo hace
 * point-in-polygon contra la geometría ya cargada (`src/lib/barrio/manzanas.ts`)
 * cuando no hay lote asociado. `null` si no cae dentro de ninguna manzana
 * (ej. un punto fuera del barrio o en un espacio verde).
 */
export async function resolverManzana(params: {
  latitud: number;
  longitud: number;
  loteId?: number | null;
}): Promise<number | null> {
  if (params.loteId) {
    const lote = await prisma.lote.findUnique({
      where: { id: params.loteId },
      select: { manzanaId: true },
    });
    if (lote) return lote.manzanaId;
  }

  const punto: [number, number] = [params.latitud, params.longitud];
  const match = MANZANAS_CONFIG.find(
    (m) => m.tipo === "manzana" && puntoEnPoligono(punto, m.bounds),
  );
  if (!match) return null;

  const manzana = await prisma.manzana.findFirst({
    where: { numero: match.numero, zona: match.zona },
    select: { id: true },
  });
  return manzana?.id ?? null;
}
