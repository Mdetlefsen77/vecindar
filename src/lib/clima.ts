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
