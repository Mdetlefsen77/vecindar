import { prisma } from "@/lib/prisma/client";
import type { Periodo } from "../periodo";
import { medianaConMinimo, composicion } from "../estadistica";
import { obtenerConfigSLA, cumplioSLA } from "../sla";
import type { SeccionRequerimientos } from "../tipos";
import type { CategoriaReq, Prioridad } from "@/generated/enums";

const CATEGORIAS: CategoriaReq[] = [
  "ILUMINACION",
  "PODA",
  "CALLES",
  "LIMPIEZA",
  "SEGURIDAD",
  "INFRAESTRUCTURA",
  "OTRO",
];

export async function contarIngresados(p: Periodo): Promise<number> {
  return prisma.requerimiento.count({
    where: { createdAt: { gte: p.inicio, lt: p.fin } },
  });
}

export async function calcularRequerimientos(
  p: Periodo,
): Promise<SeccionRequerimientos> {
  const [
    ingresados,
    porCategoriaRaw,
    backlogAlCierre,
    backlogItems,
    resolucionesFase0,
    configSLA,
  ] = await Promise.all([
    contarIngresados(p),
    prisma.requerimiento.groupBy({
      by: ["categoria"],
      where: { createdAt: { gte: p.inicio, lt: p.fin } },
      _count: true,
    }),
    prisma.requerimiento.count({
      where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
    }),
    prisma.requerimiento.findMany({
      where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
      select: { createdAt: true },
    }),
    // 🔴 Fase 0: solo transiciones registradas desde que existe TransicionEstado.
    prisma.transicionEstado.findMany({
      where: {
        entidadTipo: "REQUERIMIENTO",
        estadoNuevo: { in: ["RESUELTO", "CERRADO"] },
        ocurridoAt: { gte: p.inicio, lt: p.fin },
      },
      select: { entidadId: true, ocurridoAt: true },
    }),
    obtenerConfigSLA(),
  ]);

  const antiguedadDias = backlogItems.map(
    (r) => (p.fin.getTime() - r.createdAt.getTime()) / 86_400_000,
  );

  const idsResueltos = resolucionesFase0.map((r) => r.entidadId);
  const requerimientosResueltos =
    idsResueltos.length > 0
      ? await prisma.requerimiento.findMany({
          where: { id: { in: idsResueltos } },
          select: { id: true, createdAt: true, categoria: true, prioridad: true },
        })
      : [];
  const porId = new Map(requerimientosResueltos.map((r) => [r.id, r]));

  const diasPorCategoria = new Map<CategoriaReq, number[]>();
  let cumplieron = 0;
  let totalResueltosConFecha = 0;
  for (const t of resolucionesFase0) {
    const req = porId.get(t.entidadId);
    if (!req) continue;
    totalResueltosConFecha++;
    const dias = (t.ocurridoAt.getTime() - req.createdAt.getTime()) / 86_400_000;
    const lista = diasPorCategoria.get(req.categoria) ?? [];
    lista.push(dias);
    diasPorCategoria.set(req.categoria, lista);
    if (cumplioSLA(req.createdAt, t.ocurridoAt, req.prioridad as Prioridad, configSLA)) {
      cumplieron++;
    }
  }

  return {
    ingresados,
    porCategoria: porCategoriaRaw.map((c) => ({
      categoria: c.categoria,
      cantidad: typeof c._count === "number" ? c._count : 0,
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
    tiempoResolucionPorCategoria: CATEGORIAS.map((categoria) => ({
      categoria,
      valor: medianaConMinimo(diasPorCategoria.get(categoria) ?? []),
    })),
    cumplimientoSLA: composicion(cumplieron, totalResueltosConFecha),
  };
}
