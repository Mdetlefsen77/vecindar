import { prisma } from "@/lib/prisma/client";
import type { Periodo } from "../periodo";
import { medianaConMinimo, composicion } from "../estadistica";
import type { SeccionMascotas } from "../tipos";

export async function contarPublicadas(p: Periodo): Promise<number> {
  return prisma.mascotaPerdida.count({
    where: { createdAt: { gte: p.inicio, lt: p.fin } },
  });
}

export async function calcularMascotas(p: Periodo): Promise<SeccionMascotas> {
  const [publicadas, resueltas, cohorte] = await Promise.all([
    contarPublicadas(p),
    prisma.mascotaPerdida.count({
      where: { resueltaAt: { gte: p.inicio, lt: p.fin } },
    }),
    prisma.mascotaPerdida.findMany({
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      select: { estado: true, createdAt: true, resueltaAt: true },
    }),
  ]);

  const resueltasCohorte = cohorte.filter((m) => !m.estado); // estado false = resuelta
  const dias = resueltasCohorte
    .filter((m) => m.resueltaAt)
    .map(
      (m) => (m.resueltaAt!.getTime() - m.createdAt.getTime()) / 86_400_000,
    );

  return {
    publicadas,
    resueltas,
    tasaResolucionCohorte: composicion(resueltasCohorte.length, cohorte.length),
    medianaDiasResolucion: medianaConMinimo(dias),
  };
}
