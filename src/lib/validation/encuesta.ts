import { z } from "zod";

const textoOpcional = z
  .string()
  .max(500)
  .nullish()
  .transform((v) => v?.trim() || null);

export const encuestaSchema = z.object({
  facilidad: z.number().int().min(1).max(5),
  seLee: z.enum(["SI", "MAS_O_MENOS", "NO"]),
  nps: z.number().int().min(0).max(10),
  gusta: textoOpcional,
  cambiaria: textoOpcional,
});
