import { z } from "zod";

export const compartirEventoSchema = z.object({
  tipoEvento: z.enum(["INCIDENTE", "REQUERIMIENTO", "MASCOTA", "PARTE_TURNO"]),
  entidadId: z.coerce.number().int().positive(),
});

export type CompartirEventoInput = z.infer<typeof compartirEventoSchema>;
