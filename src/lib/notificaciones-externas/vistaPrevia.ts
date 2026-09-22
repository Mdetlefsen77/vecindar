/**
 * Copy de vista previa (Open Graph) por tipo de evento — nunca contenido del
 * evento en sí (CA-06.2 / requirement "Vista previa del link sin contenido
 * protegido"). El crawler de WhatsApp no está autenticado: lo que devuelva
 * esta función es de facto público, aunque la ruta real esté protegida.
 */
const VISTA_PREVIA_POR_TIPO: Record<string, { titulo: string; descripcion: string }> = {
  INCIDENTE: {
    titulo: "Vecindar — Incidente en el barrio",
    descripcion: "Se reportó un incidente de seguridad. Abrí Vecindar para ver el detalle.",
  },
  REQUERIMIENTO: {
    titulo: "Vecindar — Nuevo requerimiento",
    descripcion: "Se cargó un reclamo de mantenimiento en el barrio. Abrí Vecindar para ver el detalle.",
  },
  MASCOTA: {
    titulo: "Vecindar — Novedad de una mascota",
    descripcion: "Hay una novedad sobre una mascota del barrio. Abrí Vecindar para ver el detalle.",
  },
  ALERTA_PANICO: {
    titulo: "Vecindar — Alerta activa",
    descripcion: "Hay una alerta activa en el barrio. Abrí Vecindar para ver el detalle.",
  },
  RESUMEN: {
    titulo: "Vecindar — Novedades del barrio",
    descripcion: "Hay novedades cargadas en Vecindar. Abrí la app para verlas.",
  },
};

const GENERICO = {
  titulo: "Vecindar",
  descripcion: "Hay una novedad en tu barrio. Abrí Vecindar para ver el detalle.",
};

export function vistaPreviaPorTipo(tipoEvento: string | null): {
  titulo: string;
  descripcion: string;
} {
  if (!tipoEvento) return GENERICO;
  return VISTA_PREVIA_POR_TIPO[tipoEvento] ?? GENERICO;
}
