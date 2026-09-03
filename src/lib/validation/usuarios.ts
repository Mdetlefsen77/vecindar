import { z } from "zod";
import { Rol } from "@/generated/enums";

export const registroUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(40),
  apellido: z.string().trim().min(2).max(40),
  // Normaliza (trim + minúsculas) antes de validar el formato, para que el
  // `@unique` de Prisma no deje entrar "A@x.com" y "a@x.com" como cuentas distintas.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresá un email válido.").max(120)),
  password: z.string().min(6).max(100),
  telefono: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .transform((v) => v || null),
  loteId: z.coerce.number().int().positive(),
});

export const actualizarUsuarioSchema = z.object({
  rol: z.enum(Rol).optional(),
  verificado: z.boolean().optional(),
  nuevaPassword: z.string().min(6).optional(),
});

export type RegistroUsuarioInput = z.infer<typeof registroUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
