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

const TZ = "America/Argentina/Cordoba";

function diaLocal(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** "Vence hoy a las 18:30" · "Vence mañana a las 18:30" · "Quedan 3 días". */
export function textoVencimiento(venceAt: Date, ahora = new Date()): string {
  const hora = venceAt.toLocaleTimeString("es-AR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (diaLocal(venceAt) === diaLocal(ahora)) return `Vence hoy a las ${hora}`;
  if (diaLocal(venceAt) === diaLocal(new Date(ahora.getTime() + 86_400_000))) {
    return `Vence mañana a las ${hora}`;
  }
  const dias = Math.ceil((venceAt.getTime() - ahora.getTime()) / 86_400_000);
  return `Quedan ${dias} días`;
}
