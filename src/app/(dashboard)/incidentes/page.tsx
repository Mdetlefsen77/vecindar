import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import { getUserId } from "@/lib/api/guard";
import { marcarSeccionVista } from "@/lib/vistas";
import Link from "next/link";
import IncidentesFiltros from "./IncidentesFiltros";
import IncidentesMapaLazy from "./IncidentesMapaLazy";
import { type TipoIncidente, type EstadoIncidente } from "@/generated/enums";
import {
  calcularEstadoSLA,
  PRIORIDAD_CONFIG,
  ESTADO_SLA_CONFIG,
  type ConfigSLAMap,
} from "@/lib/utils/sla";

export const TIPO_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    dot: string;
    emoji?: string;
  }
> = {
  ROBO: {
    label: "Robo",
    color: "text-red-700",
    bg: "bg-red-100",
    dot: "bg-red-500",
    emoji: "🪙",
  },
  ROBO_TENTATIVA: {
    label: "Intento de robo",
    color: "text-orange-700",
    bg: "bg-orange-100",
    dot: "bg-orange-500",
    emoji: "🪙",
  },
  SOSPECHOSO: {
    label: "Sospechoso",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    dot: "bg-yellow-500",
    emoji: "🪙",
  },
  VANDALISMO: {
    label: "Vandalismo",
    color: "text-purple-700",
    bg: "bg-purple-100",
    dot: "bg-purple-500",
    emoji: "🪙",
  },
  OTRO: {
    label: "Otro",
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
    emoji: "🪙",
  },
};

export const ESTADO_CONFIG: Record<
  EstadoIncidente,
  { label: string; bg: string; text: string; border: string }
> = {
  ACTIVO: {
    label: "Activo",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-l-red-500",
  },
  RESUELTO: {
    label: "Resuelto",
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-l-green-500",
  },
  FALSA_ALARMA: {
    label: "Falsa alarma",
    bg: "bg-gray-100",
    text: "text-gray-500",
    border: "border-l-gray-300",
  },
};

type SearchParams = Promise<{
  tipo?: string;
  estado?: string;
  dias?: string;
  prioridad?: string;
}>;

export default async function IncidentesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await marcarSeccionVista(getUserId(session), "INCIDENTES");

  const { tipo, estado, dias, prioridad } = await searchParams;
  const diasNum = parseInt(dias ?? "30") || 30;
  const soloVisibles = session.user.role === "VECINO";

  const slaRows = await prisma.configSLA.findMany();
  const slaConfig: ConfigSLAMap = Object.fromEntries(
    slaRows.map((r) => [r.prioridad, r.horasLimite]),
  ) as ConfigSLAMap;

  // Server Component asíncrono: se renderiza una sola vez en el servidor, así
  // que `Date.now()` acá es determinista para esta request (la regla
  // react-hooks/purity apunta a componentes cliente).
  // eslint-disable-next-line react-hooks/purity
  const fechaDesde = new Date(Date.now() - diasNum * 24 * 60 * 60 * 1000);

  const incidentes = await prisma.incidente.findMany({
    where: {
      ...(tipo ? { tipo: tipo as TipoIncidente } : {}),
      ...(estado ? { estado: estado as EstadoIncidente } : {}),
      ...(prioridad ? { prioridad: prioridad as never } : {}),
      fechaHora: { gte: fechaDesde },
      ...(soloVisibles ? { visibleVecinos: true } : {}),
    },
    include: {
      reportadoPor: {
        select: {
          nombre: true,
          apellido: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      lote: { select: { numero: true, manzana: { select: { numero: true } } } },
    },
    orderBy: { fechaHora: "desc" },
  });

  // Pins para el mapa (solo los con coordenadas)
  const pins = incidentes
    .filter((i) => i.latitud != null && i.longitud != null)
    .map((i) => ({
      id: i.id,
      tipo: i.tipo,
      estado: i.estado,
      descripcion: i.descripcion,
      latitud: i.latitud!,
      longitud: i.longitud!,
      fechaHora: i.fechaHora.toISOString(),
      lote: i.lote,
      reportadoPor: i.reportadoPor,
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Robos, sospechos y eventos de seguridad
          </p>
        </div>
        <Link
          href="/incidentes/nuevo"
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Reportar
        </Link>
      </div>

      {/* Mapa con pins */}
      {pins.length > 0 && (
        <div className="mb-5">
          <IncidentesMapaLazy incidentes={pins} />
        </div>
      )}

      {/* Filtros */}
      <IncidentesFiltros
        tipoActivo={tipo}
        estadoActivo={estado}
        prioridadActiva={prioridad}
        diasActivo={diasNum}
      />

      {/* Conteo */}
      <p className="text-xs text-gray-500 mb-3">
        {incidentes.length} incidente{incidentes.length !== 1 ? "s" : ""} en los
        últimos {diasNum} días
      </p>

      {/* Lista */}
      {incidentes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="font-medium">Sin incidentes registrados</p>
          <p className="text-sm mt-1">Podés reportar uno si observás algo</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {incidentes.map((inc) => {
            const tipoCfg = TIPO_CONFIG[inc.tipo];
            const estadoCfg = ESTADO_CONFIG[inc.estado];
            const prioridadCfg = PRIORIDAD_CONFIG[inc.prioridad];
            const estadoSLA =
              inc.estado === "RESUELTO" || inc.estado === "FALSA_ALARMA"
                ? null
                : calcularEstadoSLA(inc.fechaHora, inc.prioridad, slaConfig);
            const slaCfg = estadoSLA ? ESTADO_SLA_CONFIG[estadoSLA] : null;
            const loteInfo = inc.lote
              ? `MZ ${inc.lote.manzana.numero} · Lote ${inc.lote.numero}`
              : null;
            return (
              <li key={inc.id}>
                <Link
                  href={`/incidentes/${inc.id}`}
                  className={`block bg-white rounded-xl border border-gray-200 border-l-4 ${
                    estadoCfg.border
                  } p-4 hover:shadow-md transition-all group`}
                >
                  <div className="flex items-start gap-3">
                    {/* Dot indicador de tipo */}
                    <div className="mt-1.5 flex-shrink-0">
                      <span
                        className={`block w-3 h-3 rounded-full ${tipoCfg.dot}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${tipoCfg.bg} ${tipoCfg.color}`}
                        >
                          {tipoCfg.label}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${estadoCfg.bg} ${estadoCfg.text}`}
                        >
                          {estadoCfg.label}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${prioridadCfg.bg} ${prioridadCfg.color}`}
                        >
                          {prioridadCfg.label}
                        </span>
                        {slaCfg && (
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${slaCfg.bg} ${slaCfg.color}`}
                          >
                            {slaCfg.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {inc.descripcion}
                      </p>
                      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100 text-xs text-gray-500">
                        <span>{nombreCompleto(inc.reportadoPor)}</span>
                        {loteInfo && <span>· {loteInfo}</span>}
                        <span className="ml-auto">
                          {new Date(inc.fechaHora).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-red-400 flex-shrink-0 mt-0.5 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
