import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { CATEGORIA_LABEL, ESTADO_CONFIG } from "../page";
import ComentarioForm from "./ComentarioForm";
import CambiarEstado from "./CambiarEstado";

type Params = { params: Promise<{ id: string }> };

export default async function DetalleRequerimientoPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const r = await prisma.requerimiento.findUnique({
    where: { id: parseInt(id) },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      comentarios: {
        include: {
          usuario: { select: { id: true, nombre: true, rol: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!r) notFound();

  const estadoCfg = ESTADO_CONFIG[r.estado];
  const loteInfo = r.usuario.lote
    ? `MZ ${r.usuario.lote.manzana.numero} · Lote ${r.usuario.lote.numero}`
    : "";
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/requerimientos"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1 min-w-0 truncate">
          {r.titulo}
        </h1>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {CATEGORIA_LABEL[r.categoria]}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estadoCfg.bg} ${estadoCfg.text}`}
          >
            {estadoCfg.label}
          </span>
        </div>

        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
          {r.descripcion}
        </p>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>
            {r.usuario.nombre}
            {loteInfo && ` · ${loteInfo}`}
          </span>
          <span>
            {new Date(r.createdAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Panel admin: cambiar estado */}
      {isAdmin && (
        <CambiarEstado requerimientoId={r.id} estadoActual={r.estado} />
      )}

      {/* Comentarios */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Comentarios ({r.comentarios.length})
        </h2>

        {r.comentarios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Aún no hay comentarios.
          </p>
        ) : (
          <ul className="space-y-3 mb-4">
            {r.comentarios.map((c) => {
              const esAdmin = c.usuario.rol === "ADMIN";
              return (
                <li
                  key={c.id}
                  className={`rounded-xl p-4 text-sm ${
                    esAdmin
                      ? "bg-blue-50 border border-blue-100"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">
                      {c.usuario.nombre}
                    </span>
                    {esAdmin && (
                      <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{c.texto}</p>
                </li>
              );
            })}
          </ul>
        )}

        <ComentarioForm requerimientoId={r.id} />
      </div>
    </div>
  );
}
