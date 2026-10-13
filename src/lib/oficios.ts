import type { EstadoOficio, GrupoOficio } from "@/generated/enums";

// Catálogo de oficios. Sin imports de servidor: lo usan páginas y formularios.

/** Máximo de oficios publicados (no rechazados) por vecino. */
export const MAX_OFICIOS_POR_USUARIO = 3;

/** Nombre de la categoría comodín para "Mi rubro no está" (carga inicial de la migración). */
export const CATEGORIA_OTROS = "Otros";

export const GRUPO_OFICIO: Record<GrupoOficio, { label: string; emoji: string }> = {
  HOGAR: { label: "Hogar y construcción", emoji: "🔨" },
  SEGURIDAD: { label: "Seguridad", emoji: "🛡️" },
  JARDIN: { label: "Jardín y exterior", emoji: "🌿" },
  TECNOLOGIA: { label: "Tecnología", emoji: "💻" },
  VEHICULOS: { label: "Vehículos", emoji: "🚗" },
  SALUD_BELLEZA: { label: "Salud y belleza", emoji: "💆" },
  EDUCACION: { label: "Educación y clases", emoji: "📚" },
  CUIDADOS: { label: "Cuidado de personas y mascotas", emoji: "🐶" },
  LIMPIEZA: { label: "Limpieza y textiles", emoji: "🧽" },
  GASTRONOMIA_EVENTOS: { label: "Gastronomía y eventos", emoji: "🎂" },
  PROFESIONALES: { label: "Servicios profesionales", emoji: "💼" },
  TRANSPORTE: { label: "Transporte", emoji: "🚚" },
  OTROS: { label: "Otros", emoji: "✨" },
};

export const ORDEN_GRUPOS = Object.keys(GRUPO_OFICIO) as GrupoOficio[];

export const ESTADO_OFICIO: Record<
  EstadoOficio,
  { label: string; clase: string }
> = {
  PENDIENTE: { label: "En revisión", clase: "bg-amber-100 text-amber-800" },
  APROBADO: { label: "Publicado", clase: "bg-green-100 text-green-700" },
  RECHAZADO: { label: "Rechazado", clase: "bg-red-100 text-red-700" },
  PAUSADO: { label: "Pausado", clase: "bg-gray-200 text-gray-700" },
};

/** "Ana P." — en recomendaciones, como en el resto de lo que se comparte entre vecinos. */
export function nombreCorto(u: { nombre: string; apellido: string }): string {
  const inicial = u.apellido.trim() ? ` ${u.apellido.trim()[0]}.` : "";
  return `${u.nombre}${inicial}`;
}

export function textoRecomendados(n: number): string {
  if (n === 0) return "Sin recomendaciones todavía";
  return n === 1 ? "Recomendado por 1 vecino" : `Recomendado por ${n} vecinos`;
}

/** Mensaje precargado del botón "Contactar por WhatsApp". */
export function mensajeContacto(titulo: string): string {
  return `Hola! Te escribo desde Vecindar por tu servicio de ${titulo}.`;
}

export interface CategoriaOpcion {
  id: number;
  nombre: string;
  grupo: GrupoOficio;
}

/** Categorías agrupadas en el orden de `ORDEN_GRUPOS`, para selects y filtros. */
export function agruparCategorias(
  categorias: CategoriaOpcion[],
): { grupo: GrupoOficio; categorias: CategoriaOpcion[] }[] {
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    categorias: categorias
      .filter((c) => c.grupo === grupo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  })).filter((g) => g.categorias.length > 0);
}
