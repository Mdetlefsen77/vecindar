export function estadoDelCielo(
  codigo: number,
): { texto: string; icono: string } | null {
  if (codigo === 0) return { texto: "Despejado", icono: "☀️" };
  if (codigo === 1) return { texto: "Mayormente despejado", icono: "🌤️" };
  if (codigo === 2) return { texto: "Parcialmente nublado", icono: "⛅" };
  if (codigo === 3) return { texto: "Nublado", icono: "☁️" };
  if (codigo === 45 || codigo === 48) return { texto: "Niebla", icono: "🌫️" };
  if (codigo >= 51 && codigo <= 57) return { texto: "Llovizna", icono: "🌦️" };
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82))
    return { texto: "Lluvia", icono: "🌧️" };
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86)
    return { texto: "Nieve", icono: "🌨️" };
  if (codigo >= 95 && codigo <= 99) return { texto: "Tormenta", icono: "⛈️" };
  return null;
}

// Fondo de las tarjetas según el cielo. Todos son lo bastante oscuros para el
// texto blanco (contraste 4.5:1 o más) y ninguno es rojo: ese color es de las
// emergencias. Las clases van completas para que Tailwind las encuentre.
const FONDO_POR_DEFECTO = "bg-gradient-to-br from-sky-700 to-blue-700";
const FONDOS: Record<string, string> = {
  Despejado: FONDO_POR_DEFECTO,
  "Mayormente despejado": FONDO_POR_DEFECTO,
  "Parcialmente nublado": "bg-gradient-to-br from-sky-700 to-slate-600",
  Nublado: "bg-gradient-to-br from-slate-600 to-slate-700",
  Niebla: "bg-gradient-to-br from-slate-600 to-gray-700",
  Llovizna: "bg-gradient-to-br from-blue-700 to-slate-700",
  Lluvia: "bg-gradient-to-br from-blue-800 to-slate-800",
  Nieve: "bg-gradient-to-br from-cyan-800 to-slate-700",
  Tormenta: "bg-gradient-to-br from-indigo-800 to-slate-900",
};

export function fondoDelCielo(estado: { texto: string } | null): string {
  return (estado && FONDOS[estado.texto]) ?? FONDO_POR_DEFECTO;
}

export function nombreDelDia(fecha: string): string {
  const texto = new Date(fecha).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export type ClimaFuerte = { titulo: string; consejo: string };

export function climaFuerte(daily: {
  weather_code?: unknown[];
  wind_gusts_10m_max?: unknown[];
  temperature_2m_max?: unknown[];
}): ClimaFuerte | null {
  const codigo = daily.weather_code?.[0];
  if (codigo === 96 || codigo === 99) {
    return { titulo: "Granizo hoy", consejo: "Guardá el auto bajo techo" };
  }
  if (typeof codigo === "number" && codigo >= 95 && codigo <= 98) {
    return { titulo: "Tormenta hoy", consejo: "Entrá las cosas de afuera" };
  }
  const rafagas = daily.wind_gusts_10m_max?.[0];
  if (typeof rafagas === "number" && rafagas >= 60) {
    return {
      titulo: "Viento fuerte hoy",
      consejo: "Asegurá lo que se pueda volar",
    };
  }
  const maxima = daily.temperature_2m_max?.[0];
  if (typeof maxima === "number" && Math.round(maxima) >= 38) {
    return {
      titulo: "Calor extremo hoy",
      consejo: "Tomá agua y evitá el sol del mediodía",
    };
  }
  return null;
}
