/**
 * Tiempo transcurrido en formato corto en español ("hace 5 min", "hace 3 días").
 * Pensado para columnas tipo "última actividad" donde importa el vistazo rápido.
 */
export function tiempoRelativo(
  fecha: Date | string | null | undefined,
): string {
  if (!fecha) return "Nunca";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const ms = Date.now() - d.getTime();
  if (ms < 0) return "recién";

  const min = Math.floor(ms / 60_000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;

  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} día${dias === 1 ? "" : "s"}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;

  const años = Math.floor(dias / 365);
  return `hace ${años} año${años === 1 ? "" : "s"}`;
}

/** `true` si la fecha cae dentro de los últimos `ventanaMin` minutos. */
export function enLinea(
  fecha: Date | string | null | undefined,
  ventanaMin = 10,
): boolean {
  if (!fecha) return false;
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Date.now() - d.getTime() < ventanaMin * 60_000;
}
