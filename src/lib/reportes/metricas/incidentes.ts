import { prisma } from "@/lib/prisma/client";
import type { Periodo } from "../periodo";
import { medianaConMinimo, composicion } from "../estadistica";
import { obtenerConfigSLA, cumplioSLA } from "../sla";
import type { SeccionIncidentes } from "../tipos";
import type { Prioridad } from "@/generated/enums";

export async function contarReportados(p: Periodo): Promise<number> {
  return prisma.incidente.count({
    where: { createdAt: { gte: p.inicio, lt: p.fin } },
  });
}

export async function calcularIncidentes(p: Periodo): Promise<SeccionIncidentes> {
  const [
    reportados,
    porTipoRaw,
    porPrioridadRaw,
    backlogAlCierre,
    backlogItems,
    cohorte,
    resolucionesFase0,
    topManzanasRaw,
    falsasAlarmas,
    configSLA,
  ] = await Promise.all([
    contarReportados(p),
    prisma.incidente.groupBy({
      by: ["tipo"],
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      _count: true,
    }),
    prisma.incidente.groupBy({
      by: ["prioridad"],
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      _count: true,
    }),
    prisma.incidente.count({ where: { estado: "ACTIVO" } }),
    prisma.incidente.findMany({
      where: { estado: "ACTIVO" },
      select: { createdAt: true },
    }),
    prisma.incidente.findMany({
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      select: { estado: true },
    }),
    // 🔴 Fase 0: solo transiciones registradas desde que existe TransicionEstado.
    prisma.transicionEstado.findMany({
      where: {
        entidadTipo: "INCIDENTE",
        estadoNuevo: "RESUELTO",
        ocurridoAt: { gte: p.inicio, lt: p.fin },
      },
      select: { entidadId: true, ocurridoAt: true },
    }),
    prisma.incidente.groupBy({
      by: ["manzanaId"],
      where: { createdAt: { gte: p.inicio, lt: p.fin }, manzanaId: { not: null } },
      _count: true,
      orderBy: { _count: { manzanaId: "desc" } },
      take: 5,
    }),
    prisma.incidente.count({
      where: { createdAt: { gte: p.inicio, lt: p.fin }, estado: "FALSA_ALARMA" },
    }),
    obtenerConfigSLA(),
  ]);

  const antiguedadDias = backlogItems.map(
    (i) => (p.fin.getTime() - i.createdAt.getTime()) / 86_400_000,
  );

  const resueltosCohorte = cohorte.filter((i) => i.estado === "RESUELTO").length;

  // Tiempo de resolución y SLA: unir cada transición a RESUELTO con el
  // createdAt real del incidente (la transición no lo trae).
  const idsResueltos = resolucionesFase0.map((r) => r.entidadId);
  const incidentesResueltos =
    idsResueltos.length > 0
      ? await prisma.incidente.findMany({
          where: { id: { in: idsResueltos } },
          select: { id: true, createdAt: true, prioridad: true },
        })
      : [];
  const porId = new Map(incidentesResueltos.map((i) => [i.id, i]));

  const diasResolucion: number[] = [];
  let cumplieron = 0;
  for (const r of resolucionesFase0) {
    const inc = porId.get(r.entidadId);
    if (!inc) continue;
    diasResolucion.push(
      (r.ocurridoAt.getTime() - inc.createdAt.getTime()) / 86_400_000,
    );
    if (cumplioSLA(inc.createdAt, r.ocurridoAt, inc.prioridad as Prioridad, configSLA)) {
      cumplieron++;
    }
  }

  const topManzanas = await Promise.all(
    topManzanasRaw.map(async (m) => {
      const manzana = await prisma.manzana.findUnique({
        where: { id: m.manzanaId! },
        select: { numero: true, zona: true },
      });
      return {
        numero: manzana?.numero ?? "?",
        zona: manzana?.zona ?? "?",
        cantidad: typeof m._count === "number" ? m._count : 0,
      };
    }),
  );

  return {
    reportados,
    porTipo: porTipoRaw.map((t) => ({
      tipo: t.tipo,
      cantidad: typeof t._count === "number" ? t._count : 0,
    })),
    porPrioridad: porPrioridadRaw.map((t) => ({
      prioridad: t.prioridad,
      cantidad: typeof t._count === "number" ? t._count : 0,
    })),
    backlogAlCierre,
    antiguedadBacklog:
      antiguedadDias.length > 0
        ? {
            medianaDias: Math.round(
              antiguedadDias.sort((a, b) => a - b)[
                Math.floor(antiguedadDias.length / 2)
              ]!,
            ),
            maximoDias: Math.round(Math.max(...antiguedadDias)),
          }
        : null,
    tasaResolucionCohorte: composicion(resueltosCohorte, cohorte.length),
    tiempoResolucion: medianaConMinimo(diasResolucion),
    cumplimientoSLA: composicion(cumplieron, diasResolucion.length),
    topManzanas,
    falsasAlarmas,
  };
}
