import { z } from "zod";
import { Rol } from "@/generated/enums";

export const registroUsuarioSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().min(1),
  password: z.string().min(6),
  telefono: z.string().optional().nullable(),
  loteId: z.union([z.number(), z.string()]),
});

export const actualizarUsuarioSchema = z.object({
  rol: z.enum(Rol).optional(),
  verificado: z.boolean().optional(),
  nuevaPassword: z.string().min(6).optional(),
});
