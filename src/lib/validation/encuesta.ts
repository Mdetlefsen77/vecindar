import { z } from "zod";

export const encuestaSchema = z.object({
  facilidad: z.number().int().min(1).max(5),
  seLee: z.enum(["SI", "MAS_O_MENOS", "NO"]),
  nps: z.number().int().min(0).max(10),
  gusta: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  cambiaria: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});
