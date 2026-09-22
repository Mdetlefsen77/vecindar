import { z } from "zod";
import { NivelReporte } from "@/generated/enums";

export const archivarReporteSchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  nivel: z.enum(NivelReporte),
  nota: z.string().trim().max(2000).optional(),
  forzarRecalculo: z.boolean().optional(),
});

export type ArchivarReporteInput = z.infer<typeof archivarReporteSchema>;
