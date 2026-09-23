// Período de prueba de la cuenta. El admin aprueba a un vecino "con 48 hs de
// prueba" o "definitivo". Vencida la prueba, la cuenta queda bloqueada
// (pantalla /prueba-finalizada) hasta que se registre su primer pago
// (recalcularVigencia limpia la prueba) o un admin la apruebe como definitiva.
// Sin imports de servidor: lo usan también componentes de cliente.

export const HORAS_PRUEBA = 48;

/** Texto que acompaña todo mensaje de invitación: la app es paga. */
export const AVISO_SUSCRIPCION = `La app funciona con una suscripción mensual y tenés ${HORAS_PRUEBA} hs de prueba gratis.`;

export type EstadoPrueba = "definitivo" | "en_prueba" | "vencida";

/** `pruebaHasta` null = acceso definitivo. */
export function estadoPrueba(
  pruebaHasta: Date | string | null | undefined,
  ahora = new Date(),
): EstadoPrueba {
  if (!pruebaHasta) return "definitivo";
  return new Date(pruebaHasta) > ahora ? "en_prueba" : "vencida";
}

/** Fin de una prueba que arranca ahora. */
export function finDePrueba(desde = new Date()): Date {
  return new Date(desde.getTime() + HORAS_PRUEBA * 3_600_000);
}

/** Horas enteras que le quedan a la prueba (mínimo 0), redondeando hacia arriba. */
export function horasRestantes(
  pruebaHasta: Date | string,
  ahora = new Date(),
): number {
  const ms = new Date(pruebaHasta).getTime() - ahora.getTime();
  return Math.max(0, Math.ceil(ms / 3_600_000));
}

/**
 * "25/09, 14:30" en hora de Argentina — fijo para que servidor (UTC en
 * Vercel) y navegador muestren lo mismo.
 */
export function fmtFechaHora(fecha: Date | string): string {
  return new Date(fecha).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
