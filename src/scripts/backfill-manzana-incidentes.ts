/**
 * scripts/backfill-manzana-incidentes.ts
 *
 * Resuelve `manzanaId` para los incidentes existentes que tienen lat/lon (o
 * loteId) pero fueron creados antes de que el campo existiera — Fase 0 de
 * docs/proposal-reportes.md (R9). A diferencia de los tiempos de resolución
 * (R8), esto sí se puede reconstruir retroactivamente: la posición geográfica
 * no cambia con el tiempo.
 *
 * Uso:
 *   npx tsx src/scripts/backfill-manzana-incidentes.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import { resolverManzana } from "../lib/reportes/manzana";

async function main() {
  const pendientes = await prisma.incidente.findMany({
    where: { manzanaId: null },
    select: { id: true, latitud: true, longitud: true, loteId: true },
  });

  console.log(`${pendientes.length} incidente(s) sin manzanaId.`);

  let resueltos = 0;
  let sinMatch = 0;

  for (const inc of pendientes) {
    if (inc.latitud === null || inc.longitud === null) {
      sinMatch++;
      continue;
    }
    const manzanaId = await resolverManzana({
      latitud: inc.latitud,
      longitud: inc.longitud,
      loteId: inc.loteId,
    });
    if (manzanaId === null) {
      sinMatch++;
      continue;
    }
    await prisma.incidente.update({
      where: { id: inc.id },
      data: { manzanaId },
    });
    resueltos++;
  }

  console.log(`✅ ${resueltos} resueltos, ${sinMatch} sin match (fuera del barrio o sin coordenadas).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
