import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import Link from "next/link";
import Image from "next/image";
import { TIPO_CONFIG, ESTADO_CONFIG } from "../page";
import {
  calcularEstadoSLA,
  PRIORIDAD_CONFIG,
  ESTADO_SLA_CONFIG,
  type ConfigSLAMap,
} from "@/lib/utils/sla";
import CambiarEstadoIncidente from "./CambiarEstadoIncidente";
import DetalleMapaMini from "./DetalleMapaMiniLazy";

type Params = { params: Promise<{ id: string }> };

export default async function DetalleIncidentePage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const inc = await prisma.incidente.findUnique({
    where: { id: parseInt(id) },
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
  });

  if (!inc) notFound();

  // Vecinos no pueden ver incidentes ocultos
  if (session.user.role === "VECINO" && !inc.visibleVecinos) notFound();

  const slaRows = await prisma.configSLA.findMany();
  const slaConfig: ConfigSLAMap = Object.fromEntries(
    slaRows.map((r) => [r.prioridad, r.horasLimite]),
  ) as ConfigSLAMap;

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
  const puedeGestionar =
    session.user.role === "ADMIN" || session.user.role === "SEGURIDAD";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/incidentes"
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
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tipoCfg.emoji ?? "📍"}</span>
          <h1 className="text-xl font-bold text-gray-900">{tipoCfg.label}</h1>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tipoCfg.bg} ${tipoCfg.color}`}
          >
            {tipoCfg.label}
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
          {!inc.visibleVecinos && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              No visible para vecinos
            </span>
          )}
        </div>

        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-4">
          {inc.descripcion}
        </p>

        {inc.ubicacionText && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <svg
              className="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            {inc.ubicacionText}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>
            {nombreCompleto(inc.reportadoPor)}
            {loteInfo && ` · ${loteInfo}`}
          </span>
          <span>
            {new Date(inc.fechaHora).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Mini mapa con pin */}
      {inc.latitud != null && inc.longitud != null && (
        <div className="mb-4">
          <DetalleMapaMini
            latitud={inc.latitud}
            longitud={inc.longitud}
            tipo={inc.tipo}
            estado={inc.estado}
          />
        </div>
      )}

      {/* Galería de imágenes */}
      {inc.imagenes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Imágenes adjuntas
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {inc.imagenes.map((url, i) => (
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

      {/* Panel de gestión — Admin y Seguridad */}
      {puedeGestionar && (
        <CambiarEstadoIncidente
          incidenteId={inc.id}
          estadoActual={inc.estado}
          prioridadActual={inc.prioridad}
          visibleVecinos={inc.visibleVecinos}
        />
      )}
    </div>
  );
}
