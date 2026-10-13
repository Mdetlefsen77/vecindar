import { z } from "zod";
import {
  EstadoRonda,
  NivelCirculacion,
  TurnoGuardia,
} from "@/generated/enums";

export const parteTurnoSchema = z.object({
  fecha: z
    .string()
    .refine(
      (f) =>
        /^\d{4}-\d{2}-\d{2}$/.test(f) &&
        !Number.isNaN(new Date(`${f}T00:00:00Z`).getTime()),
      "Fecha inválida.",
    ),
  turno: z.enum(TurnoGuardia),
  ronda: z.enum(EstadoRonda),
  circulacion: z.enum(NivelCirculacion),
  presenciaPolicial: z.boolean(),
  recomendacion: z.string().trim().max(300),
  // Vacío o null = sin novedades.
  novedades: z
    .string()
    .trim()
    .max(3000, "Las novedades son demasiado largas.")
    .nullish()
    .transform((v) => (v ? v : null)),
  imagenes: z.array(z.url()).max(6, "Máximo 6 fotos.").default([]),
});

export type ParteTurnoInput = z.infer<typeof parteTurnoSchema>;
