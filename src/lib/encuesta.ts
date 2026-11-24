const TZ = "America/Argentina/Cordoba";

/** Ronda de la encuesta: trimestre calendario en hora de Córdoba, ej. "2026-T4". */
export function rondaActual(ahora = new Date()): string {
  const anio = ahora.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 4);
  const mes = Number(
    ahora.toLocaleDateString("en-CA", { timeZone: TZ }).slice(5, 7),
  );
  return `${anio}-T${Math.ceil(mes / 3)}`;
}

export const PREGUNTAS_ENCUESTA = {
  intro: "¿Nos contás cómo te va con la app? Son 5 preguntas",
  facilidad: "¿Qué tan fácil te resulta usar la app?",
  seLee: "¿Se leen bien los textos y botones?",
  nps: "Del 0 al 10, ¿cuánto se la recomendarías a un vecino?",
  gusta: "¿Qué es lo que más te gusta?",
  cambiaria: "Si pudieras cambiar o agregar una sola cosa, ¿cuál sería?",
} as const;

export const OPCIONES_SE_LEE = [
  ["SI", "Sí"],
  ["MAS_O_MENOS", "Más o menos"],
  ["NO", "No"],
] as const;
