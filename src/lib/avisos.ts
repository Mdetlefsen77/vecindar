import type { Prisma } from "@/generated/client";
import type { TipoAviso } from "@/generated/enums";

// Avisos del barrio. Sin imports de servidor: lo usan páginas y formularios.

export type DuracionAviso = "H6" | "H24" | "D3";

export const DURACION_AVISO: Record<DuracionAviso, { label: string; ms: number }> = {
  H6: { label: "6 horas", ms: 6 * 60 * 60 * 1000 },
  H24: { label: "24 horas", ms: 24 * 60 * 60 * 1000 },
  D3: { label: "3 días", ms: 3 * 24 * 60 * 60 * 1000 },
};

/**
 * Plantillas de un toque. `riesgo`: manda push a todo el barrio (los
 * informativos solo aparecen en la app, para no cansar con notificaciones).
 * `duracion`: la que viene elegida en el formulario.
 */
export const TIPO_AVISO: Record<
  TipoAviso,
  {
    label: string;
    emoji: string;
    riesgo: boolean;
    duracion: DuracionAviso;
    ejemplo: string;
  }
> = {
  ANIMALES: {
    label: "Animales o insectos",
    emoji: "🐝",
    riesgo: true,
    duracion: "H24",
    ejemplo: "Hay un enjambre de abejas en el poste, pasen con cuidado.",
  },
  PERRO_SUELTO: {
    label: "Perro suelto",
    emoji: "🐕",
    riesgo: true,
    duracion: "H6",
    ejemplo: "Perro grande suelto, está agresivo con los que pasan.",
  },
  CORTE_LUZ: {
    label: "Corte de luz",
    emoji: "⚡",
    riesgo: false,
    duracion: "H6",
    ejemplo: "Sin luz desde las 14 h. Ya avisé a la distribuidora.",
  },
  CORTE_AGUA: {
    label: "Corte de agua",
    emoji: "💧",
    riesgo: false,
    duracion: "H24",
    ejemplo: "Sin agua en toda la manzana.",
  },
  CALLE_CORTADA: {
    label: "Calle cortada",
    emoji: "🚧",
    riesgo: true,
    duracion: "H24",
    ejemplo: "Están trabajando con una máquina, no se puede pasar.",
  },
  ARBOL_CAIDO: {
    label: "Árbol o rama caída",
    emoji: "🌳",
    riesgo: true,
    duracion: "H24",
    ejemplo: "Se cayó una rama grande sobre los cables.",
  },
  PERDIDO_ENCONTRADO: {
    label: "Perdido o encontrado",
    emoji: "📦",
    riesgo: false,
    duracion: "D3",
    ejemplo: "Encontré unas llaves con un llavero rojo.",
  },
  OTRO: {
    label: "Otro aviso",
    emoji: "📢",
    riesgo: false,
    duracion: "H24",
    ejemplo: "Contá qué pasa.",
  },
};

export const ORDEN_TIPOS_AVISO = Object.keys(TIPO_AVISO) as TipoAviso[];

/** Avisos por vecino en 24 h, para que nadie lo use de megáfono. */
export const MAX_AVISOS_POR_DIA = 3;

/** Vecinos (sin contar al autor) que tienen que marcar "Ya se resolvió" para cerrarlo. */
export const VOTOS_PARA_RESOLVER = 2;

/** Filtro de aviso vigente: lo vencido o resuelto no se muestra aunque el cron no lo haya borrado. */
export function avisoVigente(ahora = new Date()): Prisma.AvisoWhereInput {
  return { venceAt: { gt: ahora }, resueltoAt: null };
}
