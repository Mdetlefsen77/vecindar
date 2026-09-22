import { prisma } from "@/lib/prisma/client";
import { calcularEstadoSLA } from "@/lib/utils/sla";
import { nombreCompleto } from "@/lib/usuarios";
import type { Periodo, PeriodoTipo } from "./periodo";
import { periodoAnterior, ultimos12Meses, etiquetaPeriodo } from "./periodo";
import { variacion, insuficiente } from "./estadistica";
import { aplicarNivel } from "./nivel";
import type { NivelReporte, ReporteModelo, ItemRequiereAtencion } from "./tipos";
import { calcularIncidentes, contarReportados } from "./metricas/incidentes";
import { calcularPanico, contarAlertas } from "./metricas/panico";
import {
  calcularRequerimientos,
  contarIngresados,
} from "./metricas/requerimientos";
import { calcularMascotas } from "./metricas/mascotas";
import { calcularAdopcion, contarActivos30d } from "./metricas/adopcion";

/** Total de casos que pasaron a un estado de cierre dentro del período, en los 4 módulos. */
async function contarResueltosTotal(p: Periodo): Promise<number> {
  const [incidentes, requerimientos, mascotas, alertas] = await Promise.all([
    prisma.transicionEstado.count({
      where: {
        entidadTipo: "INCIDENTE",
        estadoNuevo: "RESUELTO",
        ocurridoAt: { gte: p.inicio, lt: p.fin },
      },
    }),
    prisma.transicionEstado.count({
      where: {
        entidadTipo: "REQUERIMIENTO",
        estadoNuevo: { in: ["RESUELTO", "CERRADO"] },
        ocurridoAt: { gte: p.inicio, lt: p.fin },
      },
    }),
    prisma.mascotaPerdida.count({
      where: { resueltaAt: { gte: p.inicio, lt: p.fin } },
    }),
    prisma.alertaPanico.count({
      where: { cerradoAt: { gte: p.inicio, lt: p.fin } },
    }),
  ]);
  return incidentes + requerimientos + mascotas + alertas;
}

async function contarBacklogAbierto(): Promise<number> {
  const [incidentes, requerimientos] = await Promise.all([
    prisma.incidente.count({ where: { estado: "ACTIVO" } }),
    prisma.requerimiento.count({ where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } } }),
  ]);
  return incidentes + requerimientos;
}

/** Serie de 12 meses de una métrica de conteo — para la microtendencia (§7.6/12.7). */
async function serie12(
  p: Periodo,
  contar: (periodo: Periodo) => Promise<number>,
): Promise<number[]> {
  const meses = ultimos12Meses(p);
  return Promise.all(meses.map(contar));
}

async function construirRequiereAtencion(): Promise<ItemRequiereAtencion[]> {
  const ahora = new Date();
  const hace7d = new Date(ahora.getTime() - 7 * 86_400_000);
  const hace30d = new Date(ahora.getTime() - 30 * 86_400_000);

  const [incidentesAbiertos, requerimientosAbiertos, alertasAbiertas, pendientes] =
    await Promise.all([
      prisma.incidente.findMany({
        where: { estado: "ACTIVO" },
        select: { id: true, tipo: true, prioridad: true, createdAt: true },
      }),
      prisma.requerimiento.findMany({
        where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
        select: { id: true, categoria: true, prioridad: true, createdAt: true },
      }),
      prisma.alertaPanico.findMany({
        where: { estado: { not: "CERRADO" } },
        select: {
          id: true,
          createdAt: true,
          atendioPor: { select: { nombre: true, apellido: true } },
        },
      }),
      prisma.usuario.findMany({
        where: { verificado: false, createdAt: { lt: hace7d } },
        select: { id: true, nombre: true, apellido: true, createdAt: true },
      }),
    ]);

  const items: ItemRequiereAtencion[] = [];

  for (const inc of incidentesAbiertos) {
    const vencido = calcularEstadoSLA(inc.createdAt, inc.prioridad) === "VENCIDO";
    const diasAbierto = Math.round(
      (ahora.getTime() - inc.createdAt.getTime()) / 86_400_000,
    );
    if (vencido || inc.createdAt < hace30d) {
      items.push({
        tipo: "INCIDENTE",
        entidadId: inc.id,
        titulo: `Incidente #${inc.id} — ${inc.tipo}`,
        diasAbierto,
        responsable: null,
      });
    }
  }

  for (const req of requerimientosAbiertos) {
    const vencido = calcularEstadoSLA(req.createdAt, req.prioridad) === "VENCIDO";
    const diasAbierto = Math.round(
      (ahora.getTime() - req.createdAt.getTime()) / 86_400_000,
    );
    if (vencido || req.createdAt < hace30d) {
      items.push({
        tipo: "REQUERIMIENTO",
        entidadId: req.id,
        titulo: `Requerimiento #${req.id} — ${req.categoria}`,
        diasAbierto,
        responsable: null,
      });
    }
  }

  for (const alerta of alertasAbiertas) {
    items.push({
      tipo: "ALERTA_PANICO",
      entidadId: alerta.id,
      titulo: `Alerta SOS #${alerta.id} sin cerrar`,
      diasAbierto: Math.round(
        (ahora.getTime() - alerta.createdAt.getTime()) / 86_400_000,
      ),
      responsable: alerta.atendioPor ? nombreCompleto(alerta.atendioPor) : null,
    });
  }

  for (const u of pendientes) {
    items.push({
      tipo: "VERIFICACION",
      entidadId: u.id,
      titulo: `Verificación pendiente — ${nombreCompleto(u)}`,
      diasAbierto: Math.round(
        (ahora.getTime() - u.createdAt.getTime()) / 86_400_000,
      ),
      responsable: null,
    });
  }

  return items.sort((a, b) => b.diasAbierto - a.diasAbierto);
}

export interface ConstruirReporteParams {
  periodo: Periodo;
  periodoTipo: PeriodoTipo;
  nivel: NivelReporte;
  /** D6: SEGURIDAD no ve la sección de adopción. */
  ocultarAdopcion?: boolean;
}

export async function construirReporte(
  params: ConstruirReporteParams,
): Promise<ReporteModelo> {
  const { periodo, periodoTipo, nivel } = params;
  const anterior = periodoAnterior(periodo);

  const [
    incidentes,
    panico,
    requerimientos,
    mascotas,
    adopcionCompleta,
    requiereAtencion,
    // KPIs del resumen ejecutivo — actual, anterior y serie de 12 meses en paralelo
    incidentesActual,
    incidentesAnterior,
    incidentesSerie,
    alertasActual,
    alertasAnterior,
    alertasSerie,
    requerimientosActual,
    requerimientosAnterior,
    requerimientosSerie,
    resueltosActual,
    resueltosAnterior,
    resueltosSerie,
    backlogAbierto,
    activos30dActual,
    activos30dAnterior,
    activos30dSerie,
  ] = await Promise.all([
    calcularIncidentes(periodo),
    calcularPanico(periodo),
    calcularRequerimientos(periodo),
    calcularMascotas(periodo),
    calcularAdopcion(periodo),
    construirRequiereAtencion(),
    contarReportados(periodo),
    contarReportados(anterior),
    serie12(periodo, contarReportados),
    contarAlertas(periodo),
    contarAlertas(anterior),
    serie12(periodo, contarAlertas),
    contarIngresados(periodo),
    contarIngresados(anterior),
    serie12(periodo, contarIngresados),
    contarResueltosTotal(periodo),
    contarResueltosTotal(anterior),
    serie12(periodo, contarResueltosTotal),
    contarBacklogAbierto(),
    contarActivos30d(periodo),
    contarActivos30d(anterior),
    serie12(periodo, contarActivos30d),
  ]);

  const modeloSinNivel: ReporteModelo = {
    periodo: { ...periodo, tipo: periodoTipo, etiqueta: etiquetaPeriodo(periodo, periodoTipo) },
    periodoAnterior: anterior,
    nivel,
    generadoAt: new Date().toISOString(),
    resumenEjecutivo: {
      kpis: [
        {
          label: "Incidentes reportados",
          valor: incidentesActual,
          variacion: variacion(incidentesActual, incidentesAnterior),
          serie12Meses: incidentesSerie,
          masEsMejor: false,
        },
        {
          label: "Alertas SOS",
          valor: alertasActual,
          variacion: variacion(alertasActual, alertasAnterior),
          serie12Meses: alertasSerie,
          masEsMejor: false,
        },
        {
          label: "Requerimientos ingresados",
          valor: requerimientosActual,
          variacion: variacion(requerimientosActual, requerimientosAnterior),
          serie12Meses: requerimientosSerie,
          masEsMejor: false,
        },
        {
          label: "Casos resueltos",
          valor: resueltosActual,
          variacion: variacion(resueltosActual, resueltosAnterior),
          serie12Meses: resueltosSerie,
          masEsMejor: true,
        },
        {
          label: "Backlog abierto",
          valor: backlogAbierto,
          // Es una foto "al cierre" (estado actual), no un conteo del período —
          // no hay un "backlog del período anterior" comparable de la misma forma.
          variacion: insuficiente("sin-comparacion"),
          serie12Meses: [],
          masEsMejor: false,
        },
        {
          label: "Vecinos activos (30d)",
          valor: activos30dActual,
          variacion: variacion(activos30dActual, activos30dAnterior),
          serie12Meses: activos30dSerie,
          masEsMejor: true,
        },
      ],
      notas: construirNotas({
        incidentesActual,
        incidentesAnterior,
        alertasActual,
        backlogAbierto,
      }),
      notaVolumenBajo:
        incidentesActual + alertasActual + requerimientosActual < 10
          ? "Pocos casos en el período; los indicadores de tendencia no son concluyentes."
          : null,
    },
    incidentes,
    panico,
    requerimientos,
    mascotas,
    adopcion: params.ocultarAdopcion ? null : adopcionCompleta,
    requiereAtencion: { items: requiereAtencion },
  };

  return aplicarNivel(modeloSinNivel, nivel);
}

/** Reglas simples, no IA (§4-1 de la spec) — 3-5 líneas de lenguaje natural. */
function construirNotas(datos: {
  incidentesActual: number;
  incidentesAnterior: number;
  alertasActual: number;
  backlogAbierto: number;
}): string[] {
  const notas: string[] = [];
  if (datos.incidentesActual === 0) {
    notas.push("No se reportaron incidentes en el período.");
  } else if (datos.incidentesActual < datos.incidentesAnterior) {
    notas.push(
      `Los incidentes bajaron respecto del período anterior (${datos.incidentesActual} vs. ${datos.incidentesAnterior}).`,
    );
  } else if (datos.incidentesActual > datos.incidentesAnterior) {
    notas.push(
      `Los incidentes subieron respecto del período anterior (${datos.incidentesActual} vs. ${datos.incidentesAnterior}).`,
    );
  }
  if (datos.alertasActual > 0) {
    notas.push(`Se dispararon ${datos.alertasActual} alerta(s) de pánico.`);
  }
  notas.push(
    datos.backlogAbierto === 0
      ? "No hay casos abiertos al cierre del período."
      : `Quedan ${datos.backlogAbierto} caso(s) abierto(s) al cierre del período.`,
  );
  return notas;
}
