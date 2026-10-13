// Helpers de WhatsApp compartidos (cobranza, oficios). Sin imports de servidor.

/**
 * Link `wa.me` al teléfono del vecino con el texto precargado. El teléfono se
 * carga libre en el registro, así que se normaliza a formato internacional
 * argentino (549 + área + número). Sin teléfono, abre WhatsApp para elegir el
 * contacto a mano.
 */
export function linkWhatsApp(telefono: string | null, texto: string): string {
  const q = `text=${encodeURIComponent(texto)}`;
  const numero = normalizarTelefonoAR(telefono);
  return numero ? `https://wa.me/${numero}?${q}` : `https://wa.me/?${q}`;
}

export function normalizarTelefonoAR(telefono: string | null): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  // Área + número local suman 10 dígitos. Si vino con el "15" del celular
  // (ej. 351 15 1234567 → 12 dígitos) no se puede saber dónde corta el área
  // con certeza; se prueban los largos de área posibles (2, 3 y 4 dígitos).
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === "15") {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : null;
}
