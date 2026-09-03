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

export type CrearAlertaPanicoInput = z.infer<typeof crearAlertaPanicoSchema>;
export type ActualizarAlertaPanicoInput = z.infer<
  typeof actualizarAlertaPanicoSchema
>;
export type CrearComentarioAlertaInput = z.infer<
  typeof crearComentarioAlertaSchema
>;
