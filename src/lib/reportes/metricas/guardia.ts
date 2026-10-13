import { prisma } from "@/lib/prisma/client";
import type { Periodo } from "../periodo";
import { diasDelPeriodo } from "../periodo";
import { composicion } from "../estadistica";
import type { SeccionGuardia } from "../tipos";

const TURNOS_POR_DIA = 4; // ver TURNOS en src/lib/partes.ts
const DIA_MS = 86_400_000;

export async function contarTurnosConParte(p: Periodo): Promise<number> {
  const { desde, hasta } = diasDelPeriodo(p);
  return prisma.parteTurno.count({ where: { fecha: { gte: desde, lt: hasta } } });
}

export async function contarRondasCompletas(p: Periodo): Promise<number> {
  const { desde, hasta } = diasDelPeriodo(p);
  return prisma.parteTurno.count({
    where: { fecha: { gte: desde, lt: hasta }, ronda: "FINALIZADA" },
  });
}

export async function calcularGuardia(p: Periodo): Promise<SeccionGuardia> {
  const { desde, hasta } = diasDelPeriodo(p);
  const rango = { gte: desde, lt: hasta };

  const [partes, primerParte] = await Promise.all([
    prisma.parteTurno.findMany({
      where: { fecha: rango },
      select: {
        turno: true,
        ronda: true,
        novedades: true,
        presenciaPolicial: true,
      },
    }),
    prisma.parteTurno.findFirst({
      orderBy: { fecha: "asc" },
      select: { fecha: true },
    }),
  ]);

  // Ventana de turnos esperados: [max(desde, primer parte), min(hasta, mañana)).
  const { desde: hoy } = diasDelPeriodo({ inicio: new Date(), fin: new Date() });
  const manana = new Date(hoy.getTime() + DIA_MS);
  const inicioEsperados =
    primerParte && primerParte.fecha > desde ? primerParte.fecha : desde;
  const finEsperados = hasta < manana ? hasta : manana;
  const dias = primerParte
    ? Math.max(
        0,
        Math.round((finEsperados.getTime() - inicioEsperados.getTime()) / DIA_MS),
      )
    : 0;
  const turnosEsperados = dias * TURNOS_POR_DIA;

  const contar = <T extends string>(valores: T[], orden: T[]) =>
    orden.map((v) => ({
      clave: v,
      cantidad: valores.filter((x) => x === v).length,
    }));

  const rondas = contar(
    partes.map((x) => x.ronda),
    ["FINALIZADA", "PARCIAL", "NO_REALIZADA"],
  );
  const finalizadas = rondas[0]!.cantidad;

  return {
    turnosConParte: partes.length,
    turnosEsperados,
    esperadosDesde:
      primerParte && inicioEsperados > desde
        ? inicioEsperados.toISOString().slice(0, 10)
        : null,
    // Puede haber partes cargados después del cierre por el que se calcula
    // "esperados" (ej. uno cargado de más); se topea en 100%.
    coberturaPct: composicion(
      Math.min(partes.length, turnosEsperados),
      turnosEsperados,
    ),
    rondas: rondas.map((r) => ({ estado: r.clave, cantidad: r.cantidad })),
    rondasCompletasPct: composicion(finalizadas, partes.length),
    porTurno: contar(
      partes.map((x) => x.turno),
      ["MANANA", "MEDIODIA", "MEDIATARDE", "NOCHE"],
    ).map((t) => ({ turno: t.clave, cantidad: t.cantidad })),
    conNovedades: partes.filter((x) => x.novedades).length,
    conPresenciaPolicial: partes.filter((x) => x.presenciaPolicial).length,
  };
}
