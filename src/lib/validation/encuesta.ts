import { z } from "zod";

export const encuestaSchema = z.object({
  facilidad: z.number(),
  seLee: z.string(),
  nps: z.number(),
  gusta: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  cambiaria: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});
