const TZ = "America/Argentina/Cordoba";

/** Ronda de la encuesta: trimestre calendario en hora de Córdoba, ej. "2026-T4". */
export function rondaActual(ahora = new Date()): string {
  const anio = ahora.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 4);
  const mes = Number(
    ahora.toLocaleDateString("en-CA", { timeZone: TZ }).slice(5, 7),
  );
  return `${anio}-T${Math.ceil(mes / 3)}`;
}
