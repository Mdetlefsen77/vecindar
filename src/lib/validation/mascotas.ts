import { z } from "zod";
import { TipoAlertaMascota } from "@/generated/enums";

export const crearMascotaSchema = z.object({
  tipo: z.enum(TipoAlertaMascota),
  nombre: z.string().optional().nullable(),
  descripcion: z.string().min(1).trim(),
  foto: z.string().optional().nullable(),
  zona: z.string().min(1).trim(),
  contacto: z.string().min(1).trim(),
});

export const actualizarMascotaSchema = z.object({
  estado: z.boolean(),
});

export type CrearMascotaInput = z.infer<typeof crearMascotaSchema>;
export type ActualizarMascotaInput = z.infer<typeof actualizarMascotaSchema>;
