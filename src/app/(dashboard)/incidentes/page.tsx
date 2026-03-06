import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import IncidentesFiltros from "./IncidentesFiltros";
import IncidentesMapaLazy from "./IncidentesMapaLazy";
import { type TipoIncidente, type EstadoIncidente } from "@prisma/client";

export const TIPO_CONFIG: Record<
  TipoIncidente,
  { label: string; color: string; bg: string; emoji: string }
> = {
  ROBO: { label: "Robo", color: "text-red-700", bg: "bg-red-100", emoji: "🔴" },
  ROBO_TENTATIVA: {
    label: "Intento de robo",
    color: "text-orange-700",
    bg: "bg-orange-100",
    emoji: "🟠",
  },
  SOSPECHOSO: {
    label: "Sospechoso",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    emoji: "🟡",
  },
  VANDALISMO: {
    label: "Vandalismo",
    color: "text-purple-700",
    bg: "bg-purple-100",
    emoji: "🟣",
  },
  OTRO: {
    label: "Otro",
    color: "text-gray-600",
    bg: "bg-gray-100",
    emoji: "⚫",
  },
};

export const ESTADO_CONFIG: Record<
  EstadoIncidente,
  { label: string; bg: string; text: string }
> = {
  ACTIVO: { label: "Activo", bg: "bg-red-100", text: "text-red-700" },
  RESUELTO: { label: "Resuelto", bg: "bg-green-100", text: "text-green-700" },
  FALSA_ALARMA: {
    label: "Falsa alarma",
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
};

type SearchParams = Promise<{ tipo?: string; estado?: string; dias?: string }>;

export default async function IncidentesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tipo, estado, dias } = await searchParams;
  const diasNum = parseInt(dias ?? "30") || 30;
  const soloVisibles = session.user.role === "VECINO";

  const fechaDesde = new Date(Date.now() - diasNum * 24 * 60 * 60 * 1000);

  const incidentes = await prisma.incidente.findMany({
    where: {
      ...(tipo ? { tipo: tipo as TipoIncidente } : {}),
      ...(estado ? { estado: estado as EstadoIncidente } : {}),
      fechaHora: { gte: fechaDesde },
      ...(soloVisibles ? { visibleVecinos: true } : {}),
    },
    include: {
      reportadoPor: {
        select: {
          nombre: true,
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
        diasActivo={diasNum}
      />

      {/* Conteo */}
      <p className="text-xs text-gray-400 mb-3">
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
            const loteInfo = inc.lote
              ? `MZ ${inc.lote.manzana.numero} · Lote ${inc.lote.numero}`
              : null;
            return (
              <li key={inc.id}>
                <Link
                  href={`/incidentes/${inc.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{tipoCfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoCfg.bg} ${tipoCfg.color}`}
                        >
                          {tipoCfg.label}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoCfg.bg} ${estadoCfg.text}`}
                        >
                          {estadoCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {inc.descripcion}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>{inc.reportadoPor.nombre}</span>
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
