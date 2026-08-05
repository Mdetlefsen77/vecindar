import { z } from "zod";
import { TipoIncidente, Prioridad, EstadoIncidente } from "@/generated/enums";

export const crearIncidenteSchema = z.object({
  tipo: z.enum(TipoIncidente),
  descripcion: z.string().trim().min(1),
  latitud: z.number(),
  longitud: z.number(),
  ubicacionText: z.string().trim().optional().nullable(),
  loteId: z.union([z.number(), z.string()]).optional().nullable(),
  visibleVecinos: z.boolean().optional(),
  imagenes: z.array(z.string()).optional(),
  prioridad: z.enum(Prioridad).optional(),
});

export const actualizarIncidenteSchema = z.object({
  estado: z.enum(EstadoIncidente).optional(),
  visibleVecinos: z.boolean().optional(),
  prioridad: z.enum(Prioridad).optional(),
});
