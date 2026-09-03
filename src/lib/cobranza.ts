// Cuota mensual por defecto (pesos). Se usa cuando la suscripción del usuario
// no tiene un `montoMensual` propio. Ajustá acá cuando cambie la cuota.
export const CUOTA_MENSUAL_DEFAULT = 5000;

export type EstadoCobranza = "exento" | "al_dia" | "vencida" | "sin_datos";

export const ESTADO_COBRANZA_LABEL: Record<EstadoCobranza, string> = {
  exento: "Exento",
  al_dia: "Al día",
  vencida: "Vencida",
  sin_datos: "Sin datos",
};

/** "YYYY-MM" del mes actual. */
export function periodoActual(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

const RE_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function esPeriodoValido(periodo: string): boolean {
  return RE_PERIODO.test(periodo);
}

/**
 * Último instante cubierto por un período "YYYY-MM": 23:59:59.999 del último
 * día de ese mes (hora local del servidor).
 */
export function finDePeriodo(periodo: string): Date {
  const [anio, mes] = periodo.split("-").map(Number);
  // Día 0 del mes siguiente = último día de `mes`.
  return new Date(anio, mes, 0, 23, 59, 59, 999);
}

/** Formatea "2026-09" como "sept. 2026". */
export function periodoLabel(periodo: string): string {
  if (!esPeriodoValido(periodo)) return periodo;
  const [anio, mes] = periodo.split("-").map(Number);
  const nombre = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
    month: "short",
    year: "numeric",
  });
  return nombre;
}

interface SuscripcionMinima {
  vigenteHasta: Date | string | null;
  exento: boolean;
}

export function estadoCobranza(
  suscripcion: SuscripcionMinima | null | undefined,
  ahora = new Date(),
): EstadoCobranza {
  if (!suscripcion) return "sin_datos";
  if (suscripcion.exento) return "exento";
  if (!suscripcion.vigenteHasta) return "sin_datos";
  const hasta =
    typeof suscripcion.vigenteHasta === "string"
      ? new Date(suscripcion.vigenteHasta)
      : suscripcion.vigenteHasta;
  return hasta.getTime() >= ahora.getTime() ? "al_dia" : "vencida";
}

export function montoDeSuscripcion(
  suscripcion: { montoMensual: number | null } | null | undefined,
): number {
  return suscripcion?.montoMensual ?? CUOTA_MENSUAL_DEFAULT;
}

/** "$ 3.000" */
export function formatoPesos(monto: number): string {
  return `$ ${monto.toLocaleString("es-AR")}`;
}
