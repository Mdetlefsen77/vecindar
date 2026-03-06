import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import RequerimientosFiltros from "./RequerimientosFiltros";
import { type CategoriaReq, type EstadoRequerimiento } from "@prisma/client";

// ── Helpers de display ────────────────────────────────────────────────────────

export const CATEGORIA_LABEL: Record<CategoriaReq, string> = {
  ILUMINACION: "Iluminación",
  PODA: "Poda",
  CALLES: "Calles",
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  INFRAESTRUCTURA: "Infraestructura",
  OTRO: "Otro",
};

export const ESTADO_CONFIG: Record<
  EstadoRequerimiento,
  { label: string; bg: string; text: string }
> = {
  NUEVO: { label: "Nuevo", bg: "bg-blue-100", text: "text-blue-700" },
  EN_PROGRESO: {
    label: "En progreso",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
  },
  RESUELTO: { label: "Resuelto", bg: "bg-green-100", text: "text-green-700" },
  CERRADO: { label: "Cerrado", bg: "bg-gray-100", text: "text-gray-500" },
};

// ── Página ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{
  estado?: string;
  categoria?: string;
  mine?: string;
}>;

export default async function RequerimientosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { estado, categoria, mine } = await searchParams;
  const soloMios = mine === "true";

  const requerimientos = await prisma.requerimiento.findMany({
    where: {
      ...(soloMios ? { usuarioId: parseInt(session.user.id!) } : {}),
      ...(estado ? { estado: estado as EstadoRequerimiento } : {}),
      ...(categoria ? { categoria: categoria as CategoriaReq } : {}),
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
    <div className="max-w-3xl mx-auto px-4 py-6">
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
            const estado = ESTADO_CONFIG[r.estado];
            const loteInfo = r.usuario.lote
              ? `MZ ${r.usuario.lote.manzana.numero} · Lote ${r.usuario.lote.numero}`
              : "";
            return (
              <li key={r.id}>
                <Link
                  href={`/requerimientos/${r.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {CATEGORIA_LABEL[r.categoria]}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estado.bg} ${estado.text}`}
                        >
                          {estado.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">
                        {r.titulo}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                        {r.descripcion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span>
                      {r.usuario.nombre} · {loteInfo}
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
