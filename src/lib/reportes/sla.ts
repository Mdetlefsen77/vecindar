import { prisma } from "@/lib/prisma/client";
import { SLA_DEFAULTS } from "@/lib/utils/sla";
import type { Prioridad } from "@/generated/enums";
import type { ConfigSLAMap } from "@/lib/utils/sla";

/**
 * `calcularEstadoSLA` (src/lib/utils/sla.ts) solo resuelve el estado de
 * ítems ABIERTOS contra "ahora". Para el reporte hace falta la variante
 * "¿este cerrado cumplió el plazo?", contra su fecha real de cierre — no
 * existía antes de Fase 0 (docs/proposal-reportes.md, auditoría §2).
 */
export async function obtenerConfigSLA(): Promise<ConfigSLAMap> {
  const rows = await prisma.configSLA.findMany();
  return Object.fromEntries(rows.map((r) => [r.prioridad, r.horasLimite]));
}

export function cumplioSLA(
  creadoAt: Date,
  resueltoAt: Date,
  prioridad: Prioridad,
  config: ConfigSLAMap,
): boolean {
  const horasLimite = config[prioridad] ?? SLA_DEFAULTS[prioridad];
  const horasTranscurridas =
    (resueltoAt.getTime() - creadoAt.getTime()) / 3_600_000;
  return horasTranscurridas <= horasLimite;
}
