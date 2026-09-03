import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Respuesta 400 a partir de un `ZodError`. Devuelve `error` (primer mensaje,
 * compatible con los formularios actuales que muestran un solo string) y
 * `fieldErrors` (mapa campo → mensajes, para feedback por campo).
 */
export function respuestaValidacion(
  error: z.ZodError,
  fallback = "Datos inválidos.",
): NextResponse {
  const { fieldErrors, formErrors } = z.flattenError(error);
  return NextResponse.json(
    {
      error: error.issues[0]?.message ?? formErrors[0] ?? fallback,
      fieldErrors,
    },
    { status: 400 },
  );
}
