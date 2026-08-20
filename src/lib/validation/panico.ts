import { z } from "zod";
import { EstadoAlerta } from "@/generated/enums";

export const crearAlertaPanicoSchema = z.object({
  latitud: z.number(),
  longitud: z.number(),
});

export const actualizarAlertaPanicoSchema = z.object({
  estado: z.enum(EstadoAlerta).optional(),
  notas: z.string().optional(),
});

export const crearComentarioAlertaSchema = z.object({
  texto: z.string().trim().min(1),
});
