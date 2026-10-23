import type { DuracionPromo, EstadoOficio, GrupoOficio } from "@/generated/enums";
import { formatoPesos, type EstadoCobranza } from "@/lib/cobranza";

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
/** "En tu manzana", "A 1 cuadra", "A 4 cuadras". */
export function textoCercania(cuadras: number): string {
  if (cuadras === 0) return "En tu manzana";
  return `A ${cuadras} cuadra${cuadras === 1 ? "" : "s"}`;
}

/** Link al mapa con la capa de oficios: centrado en una manzana o filtrado por rubro. */
export function linkMapaOficios({
  manzana,
  categoria,
}: { manzana?: string; categoria?: number | null } = {}): string {
  const q = new URLSearchParams({ capa: "oficios" });
  if (manzana) q.set("manzana", manzana);
  if (categoria) q.set("rubro", String(categoria));
  return `/mapa?${q}`;
}

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

// ─── Promos ───────────────────────────────────────────────────────────────────

export const DURACION_PROMO: Record<DuracionPromo, { label: string; ms: number }> = {
  DIA: { label: "24 horas", ms: 24 * 60 * 60 * 1000 },
  SEMANA: { label: "7 días", ms: 7 * 24 * 60 * 60 * 1000 },
};

/**
 * Días desde el registro en que un vecino "sin datos" (nunca pagó) puede
 * cargar promos. Pasado ese plazo tiene que tener el aporte al día.
 */
export const DIAS_GRACIA_PROMO = 30;

/** Al día, exento, o "sin datos" dentro de los primeros `DIAS_GRACIA_PROMO` días. */
export function puedeCargarPromo(
  estado: EstadoCobranza,
  registradoAt: Date,
  ahora = new Date(),
): boolean {
  if (estado === "al_dia" || estado === "exento") return true;
  if (estado === "sin_datos") {
    return ahora.getTime() - registradoAt.getTime() < DIAS_GRACIA_PROMO * 86_400_000;
  }
  return false;
}

/** "$ 8.000 (antes $ 10.000)", "$ 8.000", o null si la promo no tiene precio. */
export function textoPrecioPromo(promo: {
  precioAntes: number | null;
  precioAhora: number | null;
}): string | null {
  if (promo.precioAhora === null) return null;
  const ahora = formatoPesos(promo.precioAhora);
  return promo.precioAntes !== null
    ? `${ahora} (antes ${formatoPesos(promo.precioAntes)})`
    : ahora;
}
