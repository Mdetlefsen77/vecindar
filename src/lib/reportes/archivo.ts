import { prisma } from "@/lib/prisma/client";
import { construirReporte } from "./modelo";
import type { Periodo, PeriodoTipo } from "./periodo";
import type { NivelReporte, ReporteModelo } from "./tipos";
import { Prisma } from "@/generated/client";

/**
 * Archivo de reportes — §7.2/HU-06 de docs/proposal-reportes.md. Un reporte
 * archivado es inmutable: nunca se hace `update` ni `delete` sobre una fila
 * existente. "Recalcular" explícito no pisa el anterior — inserta uno nuevo
 * con número propio (por eso `Reporte` no tiene `@@unique` de período+nivel,
 * ver el comentario en el schema).
 */

/** El más reciente ya archivado para ese período+nivel, o `null` si no hay ninguno. */
export async function buscarArchivado(periodo: Periodo, nivel: NivelReporte) {
  return prisma.reporte.findFirst({
    where: { periodoInicio: periodo.inicio, periodoFin: periodo.fin, nivel },
    orderBy: { generadoAt: "desc" },
    include: {
      generadoPor: { select: { nombre: true, apellido: true, rol: true } },
    },
  });
}

export async function listarArchivados(nivel?: NivelReporte) {
  return prisma.reporte.findMany({
    where: nivel ? { nivel } : {},
    orderBy: { periodoInicio: "desc" },
    include: { generadoPor: { select: { nombre: true, apellido: true } } },
  });
}

export async function obtenerArchivadoPorNumero(numero: number) {
  return prisma.reporte.findUnique({
    where: { numero },
    include: { generadoPor: { select: { nombre: true, apellido: true } } },
  });
}

/**
 * Genera (o reusa) el archivo de un período+nivel.
 * - Sin `forzarRecalculo`: si ya existe uno archivado, lo devuelve tal cual
 *   (nunca recalcula un período ya cerrado — es lo que da autoridad al
 *   documento, §7.2).
 * - Con `forzarRecalculo`: siempre calcula de nuevo y archiva una fila
 *   adicional, con número nuevo, sin tocar la anterior.
 */
export async function archivarReporte(params: {
  periodo: Periodo;
  periodoTipo: PeriodoTipo;
  nivel: NivelReporte;
  generadoPorId: number;
  nota?: string | null;
  forzarRecalculo?: boolean;
}) {
  if (!params.forzarRecalculo) {
    const existente = await buscarArchivado(params.periodo, params.nivel);
    if (existente) return existente;
  }

  // Siempre completo — el filtro de adopción por rol (D6) se aplica al
  // renderizar, no al archivar (ver comentario en modelo.ts).
  const modelo = await construirReporte({
    periodo: params.periodo,
    periodoTipo: params.periodoTipo,
    nivel: params.nivel,
  });

  return prisma.reporte.create({
    data: {
      nivel: params.nivel,
      periodoTipo: params.periodoTipo,
      periodoInicio: params.periodo.inicio,
      periodoFin: params.periodo.fin,
      generadoPorId: params.generadoPorId,
      nota: params.nota || null,
      datos: modelo as unknown as Prisma.InputJsonValue,
    },
  });
}

/** El `datos` de un `Reporte` archivado, tipado de vuelta a `ReporteModelo`. */
export function datosComoModelo(datos: Prisma.JsonValue): ReporteModelo {
  return datos as unknown as ReporteModelo;
}
