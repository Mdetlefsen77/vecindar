import type { ValorEstadistico } from "./estadistica";
import type { Periodo, PeriodoTipo } from "./periodo";

/**
 * Tipos del `ReporteModelo` — docs/proposal-reportes.md §5/§16.4. Alcance de
 * esta primera versión: los KPIs y secciones que definen el spec (§4),
 * recortado a lo que aporta valor real con el volumen actual del barrio.
 * Explícitamente fuera de esta versión (queda en `docs/tasks-reportes.md`
 * como pendiente, no lo decide este archivo): distribución horaria/por día
 * de semana, "% con conversación" de alertas, "eventos por vecino vs staff".
 */

export type NivelReporte = "INTERNO" | "INSTITUCIONAL" | "DIFUSION";

export interface Kpi {
  label: string;
  valor: number;
  variacion: ValorEstadistico<{ abs: number; pct: number | null }>;
  /** Últimos 12 meses cerrados, para la microtendencia — §7.6/12.7. */
  serie12Meses: number[];
  /** Si un valor más alto es bueno o malo — decide color/ícono, no la dirección (CA-04.2). */
  masEsMejor: boolean;
}

export interface ResumenEjecutivo {
  kpis: Kpi[];
  notas: string[]; // 3-5 líneas por reglas simples (§4-1), no IA
  notaVolumenBajo: string | null; // §7.6 — "pocos casos, no concluyente"
}

export interface SeccionIncidentes {
  reportados: number;
  porTipo: { tipo: string; cantidad: number }[];
  porPrioridad: { prioridad: string; cantidad: number }[];
  backlogAlCierre: number;
  antiguedadBacklog: { medianaDias: number; maximoDias: number } | null;
  tasaResolucionCohorte: ValorEstadistico<number>;
  tiempoResolucion: ValorEstadistico<{ mediana: number; promedio: number }>; // días — 🔴 requiere Fase 0
  cumplimientoSLA: ValorEstadistico<number>; // % — 🔴 requiere Fase 0
  topManzanas: { numero: string; zona: string; cantidad: number }[];
  falsasAlarmas: number;
}

export interface SeccionPanico {
  disparadas: number;
  tiempoPrimeraRespuestaMin: ValorEstadistico<{ mediana: number; promedio: number }>;
  tiempoPrimeraRespuestaP90Min: number | null;
  tiempoHastaCierreMin: ValorEstadistico<{ mediana: number; promedio: number }>;
  pctBajoUmbral: ValorEstadistico<number>; // % con 1ª respuesta < N min
  sinCerrar: number;
}

export interface SeccionRequerimientos {
  ingresados: number;
  porCategoria: { categoria: string; cantidad: number }[];
  backlogAlCierre: number;
  antiguedadBacklog: { medianaDias: number; maximoDias: number } | null;
  tiempoResolucionPorCategoria: {
    categoria: string;
    valor: ValorEstadistico<{ mediana: number; promedio: number }>; // 🔴 requiere Fase 0
  }[];
  cumplimientoSLA: ValorEstadistico<number>; // 🔴 requiere Fase 0
}

export interface SeccionMascotas {
  publicadas: number;
  resueltas: number;
  tasaResolucionCohorte: ValorEstadistico<number>;
  medianaDiasResolucion: ValorEstadistico<{ mediana: number; promedio: number }>;
}

/** `null` si el nivel/rol no debe verla (D6 — SEGURIDAD no ve adopción). */
export interface SeccionAdopcion {
  registradosTotales: number;
  altasDelPeriodo: number;
  verificacionesPendientes: number;
  activos7d: number;
  activos30d: number;
  coberturaLotesPct: number;
  participacion: number; // vecinos distintos con ≥1 evento en el período
}

export interface ItemRequiereAtencion {
  tipo: "INCIDENTE" | "REQUERIMIENTO" | "ALERTA_PANICO" | "VERIFICACION";
  entidadId: number;
  titulo: string;
  diasAbierto: number;
  responsable: string | null;
}

export interface RequiereAtencion {
  items: ItemRequiereAtencion[];
}

export interface ReporteModelo {
  periodo: Periodo & { tipo: PeriodoTipo; etiqueta: string };
  periodoAnterior: Periodo;
  nivel: NivelReporte;
  generadoAt: string;
  resumenEjecutivo: ResumenEjecutivo;
  incidentes: SeccionIncidentes;
  panico: SeccionPanico;
  requerimientos: SeccionRequerimientos;
  mascotas: SeccionMascotas;
  adopcion: SeccionAdopcion | null;
  requiereAtencion: RequiereAtencion;
}
