import type { CategoriaReq, TipoAlertaMascota } from "@/generated/enums";

// Mismo mapeo que CATEGORIA_REQ_LABEL en src/app/api/requerimientos/route.ts
// (no exportado ahí, se duplica acá — mismo criterio que TIPO_INCIDENTE_LABEL
// en incidentes/route.ts: cada módulo tiene el suyo).
const CATEGORIA_REQ_LABEL: Record<CategoriaReq, string> = {
  ILUMINACION: "Iluminación",
  PODA: "Poda",
  CALLES: "Calles",
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  INFRAESTRUCTURA: "Infraestructura",
  OTRO: "Requerimiento",
};

export interface AutorPlantilla {
  nombre: string;
  apellido: string;
  ocultarNombreEnPublicacionExterna: boolean;
}

/**
 * Nombre + inicial del apellido (D1, docs/proposal-whatsapp-bridge.md §13),
 * o "Un vecino" si el usuario optó por no mostrarse.
 */
function nombrePublico(autor: AutorPlantilla): string {
  if (autor.ocultarNombreEnPublicacionExterna) return "Un vecino";
  const inicial = autor.apellido.trim() ? `${autor.apellido.trim()[0]}.` : "";
  return inicial ? `${autor.nombre} ${inicial}` : autor.nombre;
}

/**
 * Plantillas del mensaje "teaser" (spec funcional §4 y §7): tipo de evento,
 * autor, fecha implícita (se comparte al momento) y el link — nunca
 * descripción, ubicación exacta, fotos, ni datos de contacto.
 */
export function plantillaIncidente(autor: AutorPlantilla, link: string): string {
  return `🚨 NUEVO INCIDENTE\n\n${nombrePublico(autor)} reportó un incidente de seguridad en el barrio.\n\nVer detalle 👉 ${link}`;
}

export function plantillaRequerimiento(
  autor: AutorPlantilla,
  categoria: CategoriaReq,
  link: string,
): string {
  return `📋 NUEVO REQUERIMIENTO\n\n${nombrePublico(autor)} cargó un reclamo de ${CATEGORIA_REQ_LABEL[categoria]}.\n\nVer detalle 👉 ${link}`;
}

export function plantillaMascota(
  autor: AutorPlantilla,
  tipo: TipoAlertaMascota,
  link: string,
): string {
  const esPerdida = tipo === "PERDIDA";
  const encabezado = esPerdida ? "🐕 MASCOTA PERDIDA" : "🐾 MASCOTA ENCONTRADA";
  const accion = esPerdida
    ? "publicó la búsqueda de una mascota"
    : "avisó que encontró una mascota";
  return `${encabezado}\n\n${nombrePublico(autor)} ${accion}.\n\nVer detalle 👉 ${link}`;
}
