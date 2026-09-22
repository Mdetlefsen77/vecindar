import { prisma } from "@/lib/prisma/client";
import type { Periodo } from "../periodo";
import type { SeccionAdopcion } from "../tipos";

export async function contarActivos30d(p: Periodo): Promise<number> {
  const hace30d = new Date(p.fin.getTime() - 30 * 86_400_000);
  return prisma.usuario.count({
    where: { ultimaActividadAt: { gte: hace30d, lt: p.fin } },
  });
}

/**
 * "A la fecha de corte" usa el estado ACTUAL de `verificado`/`ultimaActividadAt`
 * (no hay historial de esos campos). Si el reporte se genera poco después de
 * cerrar el período — comportamiento esperado, §7.2 — la foto es correcta;
 * documentado como matiz en la auditoría de proposal-reportes.md §2.
 */
export async function calcularAdopcion(p: Periodo): Promise<SeccionAdopcion> {
  const hace7d = new Date(p.fin.getTime() - 7 * 86_400_000);
  const hace30d = new Date(p.fin.getTime() - 30 * 86_400_000);

  const [
    registradosTotales,
    altasDelPeriodo,
    verificacionesPendientes,
    activos7d,
    activos30d,
    totalLotes,
    lotesOcupados,
    participantesIncidentes,
    participantesRequerimientos,
    participantesMascotas,
  ] = await Promise.all([
    prisma.usuario.count({ where: { verificado: true } }),
    prisma.usuario.count({ where: { createdAt: { gte: p.inicio, lt: p.fin } } }),
    prisma.usuario.count({ where: { verificado: false } }),
    prisma.usuario.count({ where: { ultimaActividadAt: { gte: hace7d, lt: p.fin } } }),
    prisma.usuario.count({ where: { ultimaActividadAt: { gte: hace30d, lt: p.fin } } }),
    prisma.lote.count(),
    prisma.lote.count({ where: { usuarios: { some: {} } } }),
    prisma.incidente.findMany({
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      select: { reportadoPorId: true },
      distinct: ["reportadoPorId"],
    }),
    prisma.requerimiento.findMany({
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      select: { usuarioId: true },
      distinct: ["usuarioId"],
    }),
    prisma.mascotaPerdida.findMany({
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      select: { usuarioId: true },
      distinct: ["usuarioId"],
    }),
  ]);

  const participacion = new Set([
    ...participantesIncidentes.map((u) => u.reportadoPorId),
    ...participantesRequerimientos.map((u) => u.usuarioId),
    ...participantesMascotas.map((u) => u.usuarioId),
  ]).size;

  return {
    registradosTotales,
    altasDelPeriodo,
    verificacionesPendientes,
    activos7d,
    activos30d,
    coberturaLotesPct:
      totalLotes > 0 ? Math.round((lotesOcupados / totalLotes) * 1000) / 10 : 0,
    participacion,
  };
}
