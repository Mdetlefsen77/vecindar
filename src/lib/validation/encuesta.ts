import { z } from "zod";

export const encuestaSchema = z.object({
  facilidad: z.number().min(1).max(5),
  seLee: z.string(),
  nps: z.number().min(0).max(10),
  gusta: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  cambiaria: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});
