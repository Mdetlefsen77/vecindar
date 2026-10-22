import { z } from "zod";
import { TipoAviso, TipoConfirmacion } from "@/generated/enums";

export const avisoSchema = z.object({
  tipo: z.enum(TipoAviso, "Elegí qué tipo de aviso es."),
  ubicacion: z
    .string()
    .trim()
    .min(3, "Contá dónde es (ej. calle K esq. 3).")
    .max(100, "La ubicación es demasiado larga."),
  detalle: z
    .string()
    .trim()
    .max(500, "El detalle es demasiado largo.")
    .nullish()
    .transform((v) => (v ? v : null)),
  imagen: z.url().nullish().transform((v) => v ?? null),
  duracion: z.enum(["H6", "H24", "D3"], "Elegí cuánto dura el aviso."),
});

export const confirmacionAvisoSchema = z.object({
  tipo: z.enum(TipoConfirmacion),
});
