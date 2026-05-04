import type { Prioridad } from "@/generated/enums";

export type EstadoSLA = "EN_PLAZO" | "POR_VENCER" | "VENCIDO";

export const PRIORIDAD_CONFIG: Record<
    Prioridad,
    { label: string; color: string; bg: string; dot: string }
> = {
    CRITICO: {
        label: "Crítico",
        color: "text-red-700",
        bg: "bg-red-100",
        dot: "bg-red-500",
    },
    ALTO: {
        label: "Alto",
        color: "text-orange-700",
        bg: "bg-orange-100",
        dot: "bg-orange-500",
    },
    MEDIO: {
        label: "Medio",
        color: "text-yellow-700",
        bg: "bg-yellow-100",
        dot: "bg-yellow-500",
    },
    BAJO: {
        label: "Bajo",
        color: "text-gray-600",
        bg: "bg-gray-100",
        dot: "bg-gray-400",
    },
};

export const SLA_DEFAULTS: Record<Prioridad, number> = {
    CRITICO: 2,
    ALTO: 8,
    MEDIO: 48,
    BAJO: 168, // 7 días
};

export type ConfigSLAMap = Partial<Record<Prioridad, number>>;

/**
 * Calcula el estado SLA de un ítem dado su fecha de creación y prioridad.
 * - VENCIDO: tiempo transcurrido >= horasLimite
 * - POR_VENCER: tiempo restante <= 20% del SLA
 * - EN_PLAZO: el resto
 */
export function calcularEstadoSLA(
    createdAt: Date,
    prioridad: Prioridad,
    config?: ConfigSLAMap,
): EstadoSLA {
    const horasLimite =
        config?.[prioridad] ?? SLA_DEFAULTS[prioridad];
    const ahora = Date.now();
    const transcurrido = (ahora - new Date(createdAt).getTime()) / (1000 * 3600);
    const restante = horasLimite - transcurrido;

    if (transcurrido >= horasLimite) return "VENCIDO";
    if (restante / horasLimite <= 0.2) return "POR_VENCER";
    return "EN_PLAZO";
}

export const ESTADO_SLA_CONFIG: Record<
    EstadoSLA,
    { label: string; color: string; bg: string }
> = {
    EN_PLAZO: {
        label: "En plazo",
        color: "text-green-700",
        bg: "bg-green-100",
    },
    POR_VENCER: {
        label: "Por vencer",
        color: "text-amber-700",
        bg: "bg-amber-100",
    },
    VENCIDO: {
        label: "Vencido",
        color: "text-red-700",
        bg: "bg-red-100",
    },
};
