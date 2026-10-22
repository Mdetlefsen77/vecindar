// Los popups de Leaflet se arman por interpolación de strings, así que todo
// lo que viene de datos cargados por usuarios (nombres, descripciones,
// teléfonos) hay que escaparlo antes de meterlo en el HTML.
export function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
