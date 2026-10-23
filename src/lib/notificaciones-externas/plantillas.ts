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
  OTRO: "Otro",
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
/**
 * Oficio del catálogo. A diferencia del resto no es un teaser de un evento,
 * pero mantiene la regla de no sacar datos de contacto de la app: sin
 * teléfono ni manzana, solo el link (CA-06.2).
 */
export function plantillaOficio(
  autor: AutorPlantilla,
  titulo: string,
  recomendaciones: number,
  link: string,
  promo?: { titulo: string; precio: string | null; vencimiento: string } | null,
): string {
  const aval =
    recomendaciones === 0
      ? "✨ Nuevo en Oficios y servicios"
      : `👍 Recomendado por ${recomendaciones} vecino${recomendaciones === 1 ? "" : "s"}`;
  if (promo) {
    const precio = promo.precio ? `\n💲 ${promo.precio}` : "";
    return `🔥 PROMO DEL BARRIO\n\n*${promo.titulo}*${precio}\n⏳ ${promo.vencimiento}\n\n${titulo} — ${nombrePublico(autor)}\n${aval}\n\nMirá el detalle y contactalo en Vecindar 👉 ${link}`;
  }
  return `🧰 OFICIOS Y SERVICIOS DEL BARRIO\n\n*${titulo}* — ${nombrePublico(autor)}\n${aval}\n\nMirá el detalle y contactalo en Vecindar 👉 ${link}`;
}

/**
 * Aviso del barrio. A diferencia de los teasers lleva el contenido (qué pasa y
 * dónde): el aviso existe para que los vecinos se enteren, y no tiene datos
 * personales. Sí mantiene el nombre público del autor.
 */
export function plantillaAviso(
  autor: AutorPlantilla,
  aviso: {
    emoji: string;
    tipo: string;
    ubicacion: string;
    detalle: string | null;
    vencimiento: string;
  },
  link: string,
): string {
  const detalle = aviso.detalle ? `\n${aviso.detalle}` : "";
  return `${aviso.emoji} AVISO DEL BARRIO: ${aviso.tipo.toUpperCase()}\n\n📍 *${aviso.ubicacion}*${detalle}\n\nAvisó ${nombrePublico(autor)} · ${aviso.vencimiento.toLowerCase()}\n\nSi ya se resolvió, avisá en Vecindar 👉 ${link}`;
}

export function plantillaIncidente(autor: AutorPlantilla, link: string): string {
  return `🚨 NUEVO INCIDENTE\n\n${nombrePublico(autor)} reportó un incidente de seguridad en el barrio.\n\nVer detalle 👉 ${link}`;
}

export function plantillaRequerimiento(
  autor: AutorPlantilla,
  categoria: CategoriaReq,
  link: string,
): string {
  const de = categoria === "OTRO" ? "" : ` de ${CATEGORIA_REQ_LABEL[categoria]}`;
  return `📋 NUEVO PEDIDO\n\n${nombrePublico(autor)} cargó un pedido${de}.\n\nVer detalle 👉 ${link}`;
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
