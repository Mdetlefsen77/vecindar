import { z } from "zod";
import { DuracionPromo, GrupoOficio } from "@/generated/enums";
import { normalizarTelefonoAR } from "@/lib/whatsapp";

export const oficioSchema = z.object({
  categoriaId: z.coerce.number().int().positive("Elegí un rubro."),
  categoriaSugerida: z
    .string()
    .trim()
    .max(60, "El rubro sugerido es demasiado largo.")
    .nullish()
    .transform((v) => (v ? v : null)),
  titulo: z
    .string()
    .trim()
    .min(3, "Poné un título de al menos 3 letras.")
    .max(80, "El título es demasiado largo."),
  descripcion: z
    .string()
    .trim()
    .min(20, "Contá un poco más sobre tu servicio (mínimo 20 caracteres).")
    .max(1500, "La descripción es demasiado larga."),
  disponibilidad: z
    .string()
    .trim()
    .max(200, "La disponibilidad es demasiado larga.")
    .nullish()
    .transform((v) => (v ? v : null)),
  telefono: z
    .string()
    .trim()
    .refine(
      (t) => normalizarTelefonoAR(t) !== null,
      "Teléfono inválido: poné código de área y número (ej. 351 1234567).",
    ),
  imagenes: z.array(z.url()).max(6, "Máximo 6 fotos.").default([]),
});

export const recomendacionSchema = z.object({
  comentario: z
    .string()
    .trim()
    .max(500, "El comentario es demasiado largo.")
    .nullish()
    .transform((v) => (v ? v : null)),
});

export const reporteOficioSchema = z.object({
  detalle: z
    .string()
    .trim()
    .min(10, "Contanos qué pasó (mínimo 10 caracteres).")
    .max(1000, "El detalle es demasiado largo."),
});

export const moderarOficioSchema = z.object({
  accion: z.enum(["aprobar", "rechazar", "pausar", "reactivar"]),
  motivo: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null)),
  /** Reasignar rubro al aprobar (ej. tras crear la categoría sugerida). */
  categoriaId: z.coerce.number().int().positive().optional(),
});

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(60),
  grupo: z.enum(GrupoOficio),
});

export type OficioInput = z.infer<typeof oficioSchema>;

export const fotosAdminSchema = z.object({
  imagenes: z.array(z.url()).max(6, "Máximo 6 fotos."),
  aviso: z
    .string()
    .trim()
    .min(10, "Escribí el aviso para el vecino (mínimo 10 caracteres).")
    .max(300, "El aviso es demasiado largo."),
});

const precio = z.coerce
  .number()
  .int("Poné el precio sin centavos.")
  .positive("El precio tiene que ser mayor a cero.")
  .max(100_000_000, "El precio es demasiado alto.")
  .nullish()
  .transform((v) => v ?? null);

export const promoSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(3, "Poné un título de al menos 3 letras.")
      .max(80, "El título es demasiado largo."),
    descripcion: z
      .string()
      .trim()
      .max(300, "La descripción es demasiado larga.")
      .nullish()
      .transform((v) => (v ? v : null)),
    precioAntes: precio,
    precioAhora: precio,
    imagen: z.url().nullish().transform((v) => v ?? null),
    duracion: z.enum(DuracionPromo, "Elegí cuánto dura la promo."),
  })
  .refine((p) => p.precioAntes === null || p.precioAhora !== null, {
    message: "Si ponés el precio de antes, poné también el de ahora.",
    path: ["precioAhora"],
  })
  .refine(
    (p) =>
      p.precioAntes === null || p.precioAhora === null || p.precioAhora < p.precioAntes,
    { message: "El precio de ahora tiene que ser menor al de antes.", path: ["precioAhora"] },
  );
