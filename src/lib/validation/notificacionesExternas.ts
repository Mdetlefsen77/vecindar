import { z } from "zod";

export const compartirEventoSchema = z.object({
  tipoEvento: z.enum(["INCIDENTE", "REQUERIMIENTO", "MASCOTA"]),
  entidadId: z.coerce.number().int().positive(),
});

export type CompartirEventoInput = z.infer<typeof compartirEventoSchema>;
