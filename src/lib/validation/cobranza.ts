import { z } from "zod";
import { MetodoPago } from "@/generated/enums";
import { esPeriodoValido } from "@/lib/cobranza";

export const registrarPagoSchema = z.object({
  usuarioId: z.number().int().positive(),
  periodo: z.string().refine(esPeriodoValido, "Período inválido (usar YYYY-MM)."),
  monto: z.number().int().positive().max(100_000_000),
  metodo: z.enum(MetodoPago).optional(),
  nota: z.string().trim().max(500).optional(),
});

export const actualizarSuscripcionSchema = z
  .object({
    exento: z.boolean().optional(),
    montoMensual: z.number().int().positive().max(100_000_000).nullable().optional(),
    notaInterna: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (d) =>
      d.exento !== undefined ||
      d.montoMensual !== undefined ||
      d.notaInterna !== undefined,
    { message: "Nada que actualizar." },
  );

export const mpCheckoutSchema = z.object({
  tipo: z.enum(["pago", "preapproval"]),
  // Solo para tipo "pago"; si falta, se usa el período actual.
  periodo: z
    .string()
    .refine(esPeriodoValido, "Período inválido (usar YYYY-MM).")
    .optional(),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type ActualizarSuscripcionInput = z.infer<
  typeof actualizarSuscripcionSchema
>;
export type MpCheckoutInput = z.infer<typeof mpCheckoutSchema>;
