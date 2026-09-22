import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { esGestor, GESTORES_REPORTES, puedeGenerarNivel } from "@/lib/permisos";
import { construirReporte } from "@/lib/reportes/modelo";
import { limitesMes, mesAnteriorCerrado } from "@/lib/reportes/periodo";
import type { NivelReporte, ItemRequiereAtencion } from "@/lib/reportes/tipos";
import type { ValorEstadistico } from "@/lib/reportes/estadistica";
import BarrasHorizontales from "@/lib/reportes/graficos/BarrasHorizontales";
import Sparkline from "@/lib/reportes/graficos/Sparkline";

type SearchParams = Promise<{ anio?: string; mes?: string; nivel?: string }>;

const NIVELES: { valor: NivelReporte; label: string }[] = [
  { valor: "INTERNO", label: "Interno" },
  { valor: "INSTITUCIONAL", label: "Institucional" },
  { valor: "DIFUSION", label: "Difusión" },
];

// Orden fijo (define el slot de color, §11: "el color sigue a la entidad,
// nunca su rango") — el índice en este array, no el orden en que llegan los
// datos del período, decide qué color le toca a cada tipo/categoría.
const TIPOS_INCIDENTE = ["ROBO", "ROBO_TENTATIVA", "SOSPECHOSO", "VANDALISMO", "OTRO"];
const TIPO_LABEL: Record<string, string> = {
  ROBO: "Robo",
  ROBO_TENTATIVA: "Tentativa de robo",
  SOSPECHOSO: "Sospechoso",
  VANDALISMO: "Vandalismo",
  OTRO: "Otro",
};
const CATEGORIAS_REQ = [
  "ILUMINACION",
  "PODA",
  "CALLES",
  "LIMPIEZA",
  "SEGURIDAD",
  "INFRAESTRUCTURA",
  "OTRO",
];
const CATEGORIA_LABEL: Record<string, string> = {
  ILUMINACION: "Iluminación",
  PODA: "Poda",
  CALLES: "Calles",
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  INFRAESTRUCTURA: "Infraestructura",
  OTRO: "Otro",
};

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

// ── Helpers de render de ValorEstadistico<T> — §7.6, un solo lugar ─────────
function VariacionBadge({
  v,
  masEsMejor,
}: {
  v: ValorEstadistico<{ abs: number; pct: number | null }>;
  masEsMejor: boolean;
}) {
  if (!v.suficiente) {
    return <span className="text-xs text-gray-400">sin base de comparación</span>;
  }
  const { abs, pct } = v.valor;
  if (abs === 0) return <span className="text-xs text-gray-400">sin cambios</span>;
  const subio = abs > 0;
  const esBueno = subio === masEsMejor;
  const color = esBueno ? "text-green-600" : "text-red-600";
  const signo = subio ? "+" : "";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {signo}
      {abs}
      {pct !== null ? ` (${signo}${pct}%)` : ""} vs. anterior
    </span>
  );
}

function ValorConUmbral({
  v,
  unidad = "",
  render,
}: {
  v: ValorEstadistico<{ mediana: number; promedio: number }> | ValorEstadistico<number>;
  unidad?: string;
  render?: (val: { mediana: number; promedio: number } | number) => string;
}) {
  if (!v.suficiente) {
    return <span className="text-sm text-gray-400 italic">pocos casos, no concluyente</span>;
  }
  if (render) return <span className="text-sm font-semibold text-gray-900">{render(v.valor)}</span>;
  if (typeof v.valor === "number") {
    return <span className="text-sm font-semibold text-gray-900">{v.valor}{unidad}</span>;
  }
  return (
    <span className="text-sm font-semibold text-gray-900">
      {v.valor.mediana}
      {unidad}{" "}
      <span className="font-normal text-gray-400">(prom. {v.valor.promedio}{unidad})</span>
    </span>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-4">
      <h2 className="font-bold text-gray-900 text-lg">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

const TIPO_ITEM_LABEL: Record<ItemRequiereAtencion["tipo"], string> = {
  INCIDENTE: "Incidente",
  REQUERIMIENTO: "Requerimiento",
  ALERTA_PANICO: "Alerta SOS",
  VERIFICACION: "Verificación",
};

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!esGestor(session.user.role, GESTORES_REPORTES)) redirect("/");

  const sp = await searchParams;
  const nivelPedido = (sp.nivel as NivelReporte) ?? "INTERNO";
  const nivel: NivelReporte = puedeGenerarNivel(session.user.role, nivelPedido)
    ? nivelPedido
    : "INTERNO";

  const periodo =
    sp.anio && sp.mes
      ? limitesMes(Number(sp.anio), Number(sp.mes))
      : mesAnteriorCerrado();

  // D6 — SEGURIDAD no ve adopción de la plataforma (info de gestión, no operativa).
  const ocultarAdopcion = session.user.role === "SEGURIDAD";

  const modelo = await construirReporte({
    periodo,
    periodoTipo: "MENSUAL",
    nivel,
    ocultarAdopcion,
  });

  // Navegación de mes anterior/siguiente, en hora de Córdoba (mismo período que construirReporte).
  const inicioLocal = new Date(periodo.inicio);
  const mesActual = inicioLocal.getUTCMonth() + 1;
  const anioActual = inicioLocal.getUTCFullYear();
  const mesAnt = mesActual === 1 ? 12 : mesActual - 1;
  const anioAnt = mesActual === 1 ? anioActual - 1 : anioActual;
  const mesSig = mesActual === 12 ? 1 : mesActual + 1;
  const anioSig = mesActual === 12 ? anioActual + 1 : anioActual;
  const hoy = new Date();
  const esUltimoMesDisponible =
    anioSig > hoy.getFullYear() ||
    (anioSig === hoy.getFullYear() && mesSig >= hoy.getMonth() + 1);

  const linkPeriodo = (anio: number, mes: number) =>
    `/reportes?anio=${anio}&mes=${mes}&nivel=${nivel}`;
  const linkNivel = (n: NivelReporte) =>
    `/reportes?anio=${anioActual}&mes=${mesActual}&nivel=${n}`;

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 sm:px-6 sm:py-6 space-y-4">
      {/* Encabezado + selector de período y nivel */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reporte — {modelo.periodo.etiqueta}
          </h1>
          <p className="text-sm text-gray-500">
            Generado {new Date(modelo.generadoAt).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {NIVELES.map((n) => {
            const habilitado = puedeGenerarNivel(session.user.role, n.valor);
            if (!habilitado) return null;
            return (
              <Link
                key={n.valor}
                href={linkNivel(n.valor)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  nivel === n.valor
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link
          href={linkPeriodo(anioAnt, mesAnt)}
          className="text-sm text-blue-600 hover:underline font-medium px-2 py-1"
        >
          ‹ mes anterior
        </Link>
        {!esUltimoMesDisponible && (
          <Link
            href={linkPeriodo(anioSig, mesSig)}
            className="text-sm text-blue-600 hover:underline font-medium px-2 py-1"
          >
            mes siguiente ›
          </Link>
        )}
      </div>

      {/* Resumen ejecutivo */}
      <Seccion titulo="Resumen ejecutivo">
        {modelo.resumenEjecutivo.notaVolumenBajo && (
          <p className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {modelo.resumenEjecutivo.notaVolumenBajo}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modelo.resumenEjecutivo.kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="border border-gray-100 rounded-xl p-3 flex flex-col gap-1"
            >
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(kpi.valor)}</p>
              <VariacionBadge v={kpi.variacion} masEsMejor={kpi.masEsMejor} />
              {kpi.serie12Meses.length > 0 && (
                <Sparkline valores={kpi.serie12Meses} />
              )}
            </div>
          ))}
        </div>
        {modelo.resumenEjecutivo.notas.length > 0 && (
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {modelo.resumenEjecutivo.notas.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* Requiere atención */}
      <Seccion titulo="⚠️ Requiere atención">
        {modelo.requiereAtencion.items.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            ✅ No hay nada pendiente.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {modelo.requiereAtencion.items.map((item) => (
              <li
                key={`${item.tipo}-${item.entidadId}`}
                className="py-2 flex items-center justify-between gap-2 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {TIPO_ITEM_LABEL[item.tipo]}
                  </span>{" "}
                  <span className="text-gray-600">{item.titulo}</span>
                  {item.responsable && (
                    <span className="text-gray-400"> · {item.responsable}</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                  {item.diasAbierto}d abierto
                </span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* Incidentes */}
      <Seccion titulo="Seguridad — Incidentes">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Campo label="Reportados"><span className="text-sm font-semibold">{modelo.incidentes.reportados}</span></Campo>
          <Campo label="Backlog al cierre"><span className="text-sm font-semibold">{modelo.incidentes.backlogAlCierre}</span></Campo>
          <Campo label="Tasa de resolución (cohorte)"><ValorConUmbral v={modelo.incidentes.tasaResolucionCohorte} unidad="%" /></Campo>
          <Campo label="Falsas alarmas"><span className="text-sm font-semibold">{modelo.incidentes.falsasAlarmas}</span></Campo>
          <Campo label="Tiempo de resolución"><ValorConUmbral v={modelo.incidentes.tiempoResolucion} unidad=" días" /></Campo>
          <Campo label="Cumplimiento de SLA"><ValorConUmbral v={modelo.incidentes.cumplimientoSLA} unidad="%" /></Campo>
          {modelo.incidentes.antiguedadBacklog && (
            <Campo label="Antigüedad del backlog">
              <span className="text-sm font-semibold">
                {modelo.incidentes.antiguedadBacklog.medianaDias}d mediana
                <span className="font-normal text-gray-400"> (máx. {modelo.incidentes.antiguedadBacklog.maximoDias}d)</span>
              </span>
            </Campo>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-gray-500 mb-2">Por tipo</p>
            <BarrasHorizontales
              datos={modelo.incidentes.porTipo.map((t) => ({
                label: TIPO_LABEL[t.tipo] ?? t.tipo,
                valor: t.cantidad,
                colorSlot: TIPOS_INCIDENTE.indexOf(t.tipo),
              }))}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Top manzanas</p>
            {/* Ranking por magnitud, no identidad categórica — un solo tono (§11 regla 5). */}
            <BarrasHorizontales
              datos={modelo.incidentes.topManzanas.map((m) => ({
                label: `Mz. ${m.numero}`,
                valor: m.cantidad,
                colorSlot: 0,
              }))}
            />
          </div>
        </div>
      </Seccion>

      {/* Alertas de pánico */}
      <Seccion titulo="Alertas de pánico (SOS)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Campo label="Disparadas"><span className="text-sm font-semibold">{modelo.panico.disparadas}</span></Campo>
          <Campo label="Sin cerrar"><span className="text-sm font-semibold">{modelo.panico.sinCerrar}</span></Campo>
          <Campo label="Tiempo de primera respuesta">
            <ValorConUmbral v={modelo.panico.tiempoPrimeraRespuestaMin} unidad=" min" />
            {modelo.panico.tiempoPrimeraRespuestaP90Min !== null && (
              <span className="block text-xs text-gray-400">p90: {modelo.panico.tiempoPrimeraRespuestaP90Min} min</span>
            )}
          </Campo>
          <Campo label="Tiempo hasta cierre"><ValorConUmbral v={modelo.panico.tiempoHastaCierreMin} unidad=" min" /></Campo>
          <Campo label="% atendidas bajo umbral"><ValorConUmbral v={modelo.panico.pctBajoUmbral} unidad="%" /></Campo>
        </div>
      </Seccion>

      {/* Requerimientos */}
      <Seccion titulo="Mantenimiento — Requerimientos">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Campo label="Ingresados"><span className="text-sm font-semibold">{modelo.requerimientos.ingresados}</span></Campo>
          <Campo label="Backlog al cierre"><span className="text-sm font-semibold">{modelo.requerimientos.backlogAlCierre}</span></Campo>
          <Campo label="Cumplimiento de SLA"><ValorConUmbral v={modelo.requerimientos.cumplimientoSLA} unidad="%" /></Campo>
          {modelo.requerimientos.antiguedadBacklog && (
            <Campo label="Antigüedad del backlog">
              <span className="text-sm font-semibold">
                {modelo.requerimientos.antiguedadBacklog.medianaDias}d mediana
              </span>
            </Campo>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Por categoría</p>
          <BarrasHorizontales
            datos={modelo.requerimientos.porCategoria.map((c) => ({
              label: CATEGORIA_LABEL[c.categoria] ?? c.categoria,
              valor: c.cantidad,
              colorSlot: CATEGORIAS_REQ.indexOf(c.categoria),
            }))}
          />
        </div>
      </Seccion>

      {/* Mascotas */}
      <Seccion titulo="Comunidad — Mascotas">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Campo label="Publicadas"><span className="text-sm font-semibold">{modelo.mascotas.publicadas}</span></Campo>
          <Campo label="Resueltas"><span className="text-sm font-semibold">{modelo.mascotas.resueltas}</span></Campo>
          <Campo label="Tasa de resolución"><ValorConUmbral v={modelo.mascotas.tasaResolucionCohorte} unidad="%" /></Campo>
          <Campo label="Mediana hasta resolución"><ValorConUmbral v={modelo.mascotas.medianaDiasResolucion} unidad=" días" /></Campo>
        </div>
      </Seccion>

      {/* Adopción — D6: oculta para SEGURIDAD */}
      {modelo.adopcion && (
        <Seccion titulo="Adopción de la plataforma">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Campo label="Registrados totales"><span className="text-sm font-semibold">{modelo.adopcion.registradosTotales}</span></Campo>
            <Campo label="Altas del período"><span className="text-sm font-semibold">{modelo.adopcion.altasDelPeriodo}</span></Campo>
            <Campo label="Verificaciones pendientes"><span className="text-sm font-semibold">{modelo.adopcion.verificacionesPendientes}</span></Campo>
            <Campo label="Cobertura de lotes"><span className="text-sm font-semibold">{modelo.adopcion.coberturaLotesPct}%</span></Campo>
            <Campo label="Activos 7d"><span className="text-sm font-semibold">{modelo.adopcion.activos7d}</span></Campo>
            <Campo label="Activos 30d"><span className="text-sm font-semibold">{modelo.adopcion.activos30d}</span></Campo>
            <Campo label="Participación"><span className="text-sm font-semibold">{modelo.adopcion.participacion}</span></Campo>
          </div>
        </Seccion>
      )}
    </div>
  );
}
