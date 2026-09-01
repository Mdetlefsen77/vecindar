import { z } from "zod";
import { EstadoAlerta } from "@/generated/enums";

export const crearAlertaPanicoSchema = z.object({
  latitud: z.number(),
  longitud: z.number(),
});

export const actualizarAlertaPanicoSchema = z
  .object({
    estado: z.enum(EstadoAlerta).optional(),
    notas: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.estado !== undefined || d.notas !== undefined, {
    message: "Nada que actualizar.",
  });

export const crearComentarioAlertaSchema = z.object({
  texto: z.string().trim().min(1),
});
