import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { parseId } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIA_LABEL, ESTADO_CONFIG } from "../page";
import {
  calcularEstadoSLA,
  PRIORIDAD_CONFIG,
  ESTADO_SLA_CONFIG,
  type ConfigSLAMap,
} from "@/lib/utils/sla";
import ComentarioForm from "./ComentarioForm";
import CambiarEstado from "./CambiarEstado";

type Params = { params: Promise<{ id: string }> };

export default async function DetalleRequerimientoPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const numId = parseId(id);
  if (numId === null) notFound();

  // El requerimiento y la config de SLA son independientes — en paralelo.
  const [r, slaRows] = await Promise.all([
    prisma.requerimiento.findUnique({
      where: { id: numId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            lote: {
              select: { numero: true, manzana: { select: { numero: true } } },
            },
          },
        },
        comentarios: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellido: true, rol: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.configSLA.findMany(),
  ]);

  if (!r) notFound();

  const slaConfig: ConfigSLAMap = Object.fromEntries(
    slaRows.map((row) => [row.prioridad, row.horasLimite]),
  ) as ConfigSLAMap;

  const estadoCfg = ESTADO_CONFIG[r.estado];
  const prioridadCfg = PRIORIDAD_CONFIG[r.prioridad];
  const estadoSLA =
    r.estado === "RESUELTO" || r.estado === "CERRADO"
      ? null
      : calcularEstadoSLA(r.createdAt, r.prioridad, slaConfig);
  const slaCfg = estadoSLA ? ESTADO_SLA_CONFIG[estadoSLA] : null;
  const loteInfo = r.usuario.lote
    ? `MZ ${r.usuario.lote.manzana.numero} · Lote ${r.usuario.lote.numero}`
    : "";
  const puedeGestionar = ["ADMIN", "SEGURIDAD", "REFERENTE_MANZANA"].includes(
    session.user.role,
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/requerimientos"
          aria-label="Volver"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg
            aria-hidden="true"
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
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${prioridadCfg.bg} ${prioridadCfg.color}`}
          >
            {prioridadCfg.label}
          </span>
          {slaCfg && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${slaCfg.bg} ${slaCfg.color}`}
            >
              {slaCfg.label}
            </span>
          )}
        </div>

        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
          {r.descripcion}
        </p>

        {/* Imágenes adjuntas */}
        {r.imagenes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Imágenes adjuntas
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {r.imagenes.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 block hover:opacity-90 transition-opacity"
                >
                  <Image
                    src={url}
                    alt={`imagen ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>
            {nombreCompleto(r.usuario)}
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

      {/* Panel de gestión — Admin, Seguridad y Referente de manzana */}
      {puedeGestionar && (
        <CambiarEstado
          requerimientoId={r.id}
          estadoActual={r.estado}
          prioridadActual={r.prioridad}
        />
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
                      {nombreCompleto(c.usuario)}
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
