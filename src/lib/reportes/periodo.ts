import { differenceInMilliseconds, startOfWeek, subMonths } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Única definición de período del proyecto — docs/proposal-reportes.md §6.
 * Todos los cortes de mes/semana se calculan en hora de Córdoba, nunca en UTC
 * (§7.1 de la spec: un evento de las 21:30 ART del día 30 cae en UTC el día
 * siguiente — calculado en UTC, el reporte ubica mal el caso sin avisar).
 *
 * Ningún archivo de `metricas/*.ts` hace aritmética de fechas por su cuenta:
 * todos reciben `{ inicio, fin }` ya resuelto de acá.
 */

export const ZONA_HORARIA = "America/Argentina/Cordoba";

export type Periodo = { inicio: Date; fin: Date };
export type PeriodoTipo = "MENSUAL" | "SEMANAL" | "PERSONALIZADO";

/** Medianoche del día `d` en Córdoba, expresada como instante UTC. */
function medianocheCordoba(d: Date): Date {
  const local = toZonedTime(d, ZONA_HORARIA);
  local.setHours(0, 0, 0, 0);
  return fromZonedTime(local, ZONA_HORARIA);
}

/** Período `[inicio, fin)` de un mes calendario, en hora de Córdoba. */
export function limitesMes(anio: number, mes: number): Periodo {
  // mes: 1-12, igual que en las URLs/inputs — no el 0-11 de Date nativo.
  const inicio = medianocheCordoba(new Date(Date.UTC(anio, mes - 1, 1, 12)));
  const fin = medianocheCordoba(new Date(Date.UTC(anio, mes, 1, 12)));
  return { inicio, fin };
}

/**
 * Período `[inicio, fin)` de la semana que contiene `fecha`, en hora de
 * Córdoba. La semana arranca el lunes (D11 de la propuesta — convención
 * local/ISO).
 */
export function limitesSemana(fecha: Date): Periodo {
  const inicioLocal = startOfWeek(toZonedTime(fecha, ZONA_HORARIA), {
    weekStartsOn: 1,
  });
  inicioLocal.setHours(0, 0, 0, 0);
  const inicio = fromZonedTime(inicioLocal, ZONA_HORARIA);
  const finLocal = new Date(inicioLocal);
  finLocal.setDate(finLocal.getDate() + 7);
  const fin = fromZonedTime(finLocal, ZONA_HORARIA);
  return { inicio, fin };
}

/**
 * Default de CA-01.2: el mes anterior **completo y cerrado**, nunca el mes en
 * curso — un período incompleto produce comparaciones falsas.
 */
export function mesAnteriorCerrado(ahora: Date = new Date()): Periodo {
  const mesActual = toZonedTime(ahora, ZONA_HORARIA);
  const anterior = subMonths(mesActual, 1);
  return limitesMes(anterior.getFullYear(), anterior.getMonth() + 1);
}

/** Período inmediatamente anterior, del mismo largo — para las variaciones de HU-04. */
export function periodoAnterior(p: Periodo): Periodo {
  const largoMs = differenceInMilliseconds(p.fin, p.inicio);
  // Un mes no tiene largo fijo en ms (28-31 días) — recalculamos por mes
  // calendario cuando el largo es ~mensual, para que "agosto" compare contra
  // "julio" y no contra "31 días antes de agosto" (que a veces cae en julio,
  // a veces todavía en junio).
  const esMensual = largoMs > 27 * 86_400_000 && largoMs < 32 * 86_400_000;
  if (esMensual) {
    const inicioLocal = toZonedTime(p.inicio, ZONA_HORARIA);
    const anterior = subMonths(inicioLocal, 1);
    return limitesMes(anterior.getFullYear(), anterior.getMonth() + 1);
  }
  return {
    inicio: new Date(p.inicio.getTime() - largoMs),
    fin: p.inicio,
  };
}

/** Los últimos 12 meses cerrados hasta (sin incluir) el mes de `p.inicio` — para las microtendencias de §7.6. */
export function ultimos12Meses(p: Periodo): Periodo[] {
  const meses: Periodo[] = [];
  const cursor = toZonedTime(p.inicio, ZONA_HORARIA);
  for (let i = 12; i >= 1; i--) {
    const mes = subMonths(cursor, i);
    meses.push(limitesMes(mes.getFullYear(), mes.getMonth() + 1));
  }
  return meses;
}

/** `true` si `fecha` cae dentro de `[p.inicio, p.fin)`. */
export function enPeriodo(fecha: Date, p: Periodo): boolean {
  return fecha >= p.inicio && fecha < p.fin;
}

/** Formato "septiembre 2026" / "semana del 15/09" para portada y selector. */
export function etiquetaPeriodo(p: Periodo, tipo: PeriodoTipo): string {
  const inicioLocal = toZonedTime(p.inicio, ZONA_HORARIA);
  if (tipo === "MENSUAL") {
    return inicioLocal.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
      timeZone: ZONA_HORARIA,
    });
  }
  return `semana del ${inicioLocal.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: ZONA_HORARIA })}`;
}
