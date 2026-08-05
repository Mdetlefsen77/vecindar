import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { marcarSeccionVista } from "@/lib/vistas";
import Link from "next/link";
import RequerimientosFiltros from "./RequerimientosFiltros";
import { type CategoriaReq, type EstadoRequerimiento } from "@/generated/enums";
import {
  calcularEstadoSLA,
  PRIORIDAD_CONFIG,
  ESTADO_SLA_CONFIG,
  SLA_DEFAULTS,
  type ConfigSLAMap,
} from "@/lib/utils/sla";

// ── Helpers de display ────────────────────────────────────────────────────────

export const CATEGORIA_CONFIG: Record<
  CategoriaReq,
  { label: string; color: string }
> = {
  ILUMINACION: { label: "Iluminación", color: "bg-yellow-100 text-yellow-800" },
  PODA: { label: "Poda", color: "bg-green-100 text-green-800" },
  CALLES: { label: "Calles", color: "bg-stone-100 text-stone-700" },
  LIMPIEZA: { label: "Limpieza", color: "bg-sky-100 text-sky-700" },
  SEGURIDAD: { label: "Seguridad", color: "bg-red-100 text-red-700" },
  INFRAESTRUCTURA: {
    label: "Infraestructura",
    color: "bg-orange-100 text-orange-700",
  },
  OTRO: { label: "Otro", color: "bg-gray-100 text-gray-600" },
};

export const CATEGORIA_LABEL: Record<CategoriaReq, string> = Object.fromEntries(
  (
    Object.entries(CATEGORIA_CONFIG) as [
      CategoriaReq,
      { label: string; color: string },
    ][]
  ).map(([k, v]) => [k, v.label]),
) as Record<CategoriaReq, string>;

export const ESTADO_CONFIG: Record<
  EstadoRequerimiento,
  { label: string; bg: string; text: string; border: string }
> = {
  NUEVO: {
    label: "Nuevo",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-l-blue-500",
  },
  EN_PROGRESO: {
    label: "En progreso",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-l-amber-400",
  },
  RESUELTO: {
    label: "Resuelto",
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-l-green-500",
  },
  CERRADO: {
    label: "Cerrado",
    bg: "bg-gray-100",
    text: "text-gray-500",
    border: "border-l-gray-300",
  },
};

// ── Página ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{
  estado?: string;
  categoria?: string;
  prioridad?: string;
  mine?: string;
}>;

export default async function RequerimientosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await marcarSeccionVista(parseInt(session.user.id!), "REQUERIMIENTOS");

  const { estado, categoria, mine, prioridad } = await searchParams;
  const soloMios = mine === "true";

  const slaRows = await prisma.configSLA.findMany();
  const slaConfig: ConfigSLAMap = Object.fromEntries(
    slaRows.map((r) => [r.prioridad, r.horasLimite]),
  ) as ConfigSLAMap;

  const requerimientos = await prisma.requerimiento.findMany({
    where: {
      ...(soloMios ? { usuarioId: parseInt(session.user.id!) } : {}),
      ...(estado ? { estado: estado as EstadoRequerimiento } : {}),
      ...(categoria ? { categoria: categoria as CategoriaReq } : {}),
      ...(prioridad ? { prioridad: prioridad as never } : {}),
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      _count: { select: { comentarios: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requerimientos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pedidos, reclamos y sugerencias del barrio
          </p>
        </div>
        <Link
          href="/requerimientos/nuevo"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
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
          Nuevo
        </Link>
      </div>

      {/* Filtros */}
      <RequerimientosFiltros
        estadoActivo={estado}
        categoriaActiva={categoria}
        prioridadActiva={prioridad}
        soloMios={soloMios}
        userRole={session.user.role ?? "VECINO"}
      />

      {/* Lista */}
      {requerimientos.length === 0 ? (
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
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="font-medium">No hay requerimientos</p>
          <p className="text-sm mt-1">
            Podés crear uno con el botón &quot;Nuevo&quot;
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requerimientos.map((r) => {
            const estadoCfg = ESTADO_CONFIG[r.estado];
            const catCfg = CATEGORIA_CONFIG[r.categoria];
            const prioridadCfg = PRIORIDAD_CONFIG[r.prioridad];
            const estadoSLA =
              r.estado === "RESUELTO" || r.estado === "CERRADO"
                ? null
                : calcularEstadoSLA(r.createdAt, r.prioridad, slaConfig);
            const slaCfg = estadoSLA ? ESTADO_SLA_CONFIG[estadoSLA] : null;
            const loteInfo = r.usuario.lote
              ? `MZ ${r.usuario.lote.manzana.numero} · Lote ${r.usuario.lote.numero}`
              : "";
            return (
              <li key={r.id}>
                <Link
                  href={`/requerimientos/${r.id}`}
                  className={`block bg-white rounded-xl border border-gray-200 border-l-4 ${
                    estadoCfg.border
                  } p-4 hover:shadow-md transition-all group`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${catCfg.color}`}
                        >
                          {catCfg.label}
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
                      <p className="font-semibold text-gray-900 line-clamp-2 text-[15px] leading-snug">
                        {r.titulo}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {r.descripcion}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors"
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
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      {r.usuario.nombre}
                      {loteInfo ? ` · ${loteInfo}` : ""}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      {r._count.comentarios}
                    </span>
                    <span>
                      {new Date(r.createdAt).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
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
