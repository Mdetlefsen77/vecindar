import { z } from "zod";
import {
  CategoriaReq,
  Prioridad,
  EstadoRequerimiento,
} from "@/generated/enums";

export const crearRequerimientoSchema = z.object({
  categoria: z.enum(CategoriaReq),
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
  imagenes: z.array(z.string()).optional(),
  prioridad: z.enum(Prioridad).optional(),
});

export const actualizarRequerimientoSchema = z
  .object({
    estado: z.enum(EstadoRequerimiento).optional(),
    prioridad: z.enum(Prioridad).optional(),
  })
  .refine((data) => data.estado !== undefined || data.prioridad !== undefined, {
    message: "Nada que actualizar.",
  });

export const crearComentarioSchema = z.object({
  texto: z.string().trim().min(1),
});
