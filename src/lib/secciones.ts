// Identidad de cada sección: nombre corto, ruta y color. Una sola fuente para
// Inicio, la barra de abajo, el menú lateral y los títulos de cada sección,
// así un vecino reconoce dónde está por el color. El rojo queda reservado al
// SOS y a las emergencias (modo alerta de Inicio).
//
// Las clases van escritas completas (no armadas con template strings) para
// que Tailwind las encuentre al compilar.

export type Seccion =
  | "avisos"
  | "incidentes"
  | "requerimientos"
  | "mascotas"
  | "oficios"
  | "mapa"
  | "partes";

export interface EstiloSeccion {
  /** Nombre de la sección: títulos, menús y "Más". */
  label: string;
  /** Si el nombre no entra en el botón de Inicio o en el mapa, el corto. */
  corto?: string;
  href: string;
  /** Fondo suave + ícono en color: el cuadradito del ícono. */
  chip: string;
  /** Texto o ícono en el color de la sección sobre fondo blanco. */
  texto: string;
  /** Ítem de menú activo: fondo suave, texto y borde del color. */
  activo: string;
}

export const SECCIONES: Record<Seccion, EstiloSeccion> = {
  avisos: {
    label: "Avisos",
    href: "/avisos",
    chip: "bg-yellow-100 text-yellow-700",
    texto: "text-yellow-700",
    activo: "bg-yellow-50 text-yellow-800 border-yellow-300",
  },
  incidentes: {
    label: "Incidentes",
    href: "/incidentes",
    chip: "bg-orange-100 text-orange-700",
    texto: "text-orange-700",
    activo: "bg-orange-50 text-orange-800 border-orange-300",
  },
  requerimientos: {
    label: "Pedidos",
    href: "/requerimientos",
    chip: "bg-violet-100 text-violet-700",
    texto: "text-violet-700",
    activo: "bg-violet-50 text-violet-800 border-violet-300",
  },
  mascotas: {
    label: "Mascotas",
    href: "/mascotas",
    chip: "bg-teal-100 text-teal-700",
    texto: "text-teal-700",
    activo: "bg-teal-50 text-teal-800 border-teal-300",
  },
  oficios: {
    label: "Oficios y servicios",
    corto: "Servicios",
    href: "/oficios",
    chip: "bg-indigo-100 text-indigo-700",
    texto: "text-indigo-700",
    activo: "bg-indigo-50 text-indigo-800 border-indigo-300",
  },
  mapa: {
    label: "Mapa",
    href: "/mapa",
    chip: "bg-blue-100 text-blue-700",
    texto: "text-blue-700",
    activo: "bg-blue-50 text-blue-800 border-blue-300",
  },
  partes: {
    label: "Partes",
    href: "/partes",
    chip: "bg-slate-200 text-slate-700",
    texto: "text-slate-700",
    activo: "bg-slate-100 text-slate-800 border-slate-300",
  },
};

/** Orden por uso: lo que cambia todos los días primero. */
export const ORDEN_INICIO = [
  "avisos",
  "incidentes",
  "mapa",
  "requerimientos",
  "mascotas",
  "oficios",
] as const satisfies readonly Seccion[];
