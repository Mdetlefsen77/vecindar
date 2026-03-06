import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import BotonSOS from "./BotonSOS";
import AccionesAlerta from "./AccionesAlerta";
import { type EstadoAlerta } from "@prisma/client";

const ESTADO_BADGE: Record<
  EstadoAlerta,
  { label: string; bg: string; text: string; dot: string }
> = {
  ENVIADO: {
    label: "Enviada",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  RECIBIDO: {
    label: "Recibida",
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  EN_ATENCION: {
    label: "En atención",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  CERRADO: {
    label: "Cerrada",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
};

export default async function PanicoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const esAdmin =
    session.user.role === "ADMIN" || session.user.role === "SEGURIDAD";

  // ── VISTA VECINO ─────────────────────────────────────────────────────────
  if (!esAdmin) {
    const alertaActiva = await prisma.alertaPanico.findFirst({
      where: {
        usuarioId: parseInt(session.user.id!),
        estado: { in: ["ENVIADO", "RECIBIDO", "EN_ATENCION"] },
      },
      include: { atendioPor: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    });

    return (
      <BotonSOS
        alertaActivaInicial={
          alertaActiva
            ? {
                id: alertaActiva.id,
                estado: alertaActiva.estado,
                createdAt: alertaActiva.createdAt.toISOString(),
                notas: alertaActiva.notas,
                atendioPor: alertaActiva.atendioPor,
              }
            : null
        }
      />
    );
  }

  // ── VISTA ADMIN / SEGURIDAD ───────────────────────────────────────────────
  const [activas, recientes] = await Promise.all([
    prisma.alertaPanico.findMany({
      where: { estado: { in: ["ENVIADO", "RECIBIDO", "EN_ATENCION"] } },
      include: {
        usuario: {
          select: {
            nombre: true,
            telefono: true,
            lote: {
              select: { numero: true, manzana: { select: { numero: true } } },
            },
          },
        },
        atendioPor: { select: { nombre: true } },
      },
      orderBy: { createdAt: "asc" }, // las más antiguas primero (más urgentes)
    }),
    prisma.alertaPanico.findMany({
      where: { estado: "CERRADO" },
      include: {
        usuario: {
          select: {
            nombre: true,
            lote: {
              select: { numero: true, manzana: { select: { numero: true } } },
            },
          },
        },
        atendioPor: { select: { nombre: true } },
      },
      orderBy: { cerradoAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Panel de Pánico SOS
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activas.length === 0
              ? "Sin alertas activas ✅"
              : `${activas.length} alerta${activas.length > 1 ? "s" : ""} activa${activas.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {activas.length > 0 && (
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
        )}
      </div>

      {/* Alertas activas */}
      {activas.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-2xl border-2 border-green-200">
          <div className="text-5xl mb-2">✅</div>
          <p className="font-semibold text-green-700">Sin alertas activas</p>
          <p className="text-sm text-green-600 mt-1">
            El barrio está tranquilo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-red-700 text-sm uppercase tracking-wide">
            🚨 Alertas activas
          </h2>
          {activas.map((a) => {
            const badge = ESTADO_BADGE[a.estado];
            const tiempoTranscurrido = Math.floor(
              (Date.now() - new Date(a.createdAt).getTime()) / 60000,
            );

            return (
              <div
                key={a.id}
                className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 space-y-3"
              >
                {/* Info del vecino */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-200 flex items-center justify-center text-red-800 font-bold text-lg shrink-0">
                      {a.usuario.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {a.usuario.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        MZ {a.usuario.lote.manzana.numero} – Lote{" "}
                        {a.usuario.lote.numero}
                      </p>
                      {a.usuario.telefono && (
                        <p className="text-sm text-blue-700 font-medium">
                          📞 {a.usuario.telefono}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${badge.bg} ${badge.text} flex items-center gap-1.5`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`}
                      />
                      {badge.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      hace{" "}
                      {tiempoTranscurrido === 0
                        ? "menos de 1 min"
                        : `${tiempoTranscurrido} min`}
                    </p>
                  </div>
                </div>

                {/* Coordenadas */}
                {(a.latitud !== 0 || a.longitud !== 0) && (
                  <a
                    href={`https://maps.google.com/?q=${a.latitud},${a.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    📍 Ver ubicación en Google Maps →
                  </a>
                )}

                {/* Quién atiende */}
                {a.atendioPor && (
                  <p className="text-xs text-gray-500">
                    Atendiendo:{" "}
                    <span className="font-medium">{a.atendioPor.nombre}</span>
                  </p>
                )}

                {/* Notas actuales */}
                {a.notas && (
                  <div className="bg-white border border-blue-100 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium">
                      Mensaje enviado al vecino:
                    </p>
                    <p className="text-sm text-gray-700 italic mt-0.5">
                      "{a.notas}"
                    </p>
                  </div>
                )}

                {/* Acciones */}
                <AccionesAlerta
                  alertaId={a.id}
                  estadoActual={a.estado}
                  notasActuales={a.notas}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Historial reciente */}
      {recientes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-600 text-sm uppercase tracking-wide mb-3">
            Historial reciente
          </h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {recientes.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-4 py-3 bg-white"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm shrink-0">
                  {a.usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {a.usuario.nombre}
                  </p>
                  <p className="text-xs text-gray-400">
                    MZ {a.usuario.lote.manzana.numero} – Lote{" "}
                    {a.usuario.lote.numero}
                    {a.atendioPor && ` · Atendida por ${a.atendioPor.nombre}`}
                  </p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">
                  {a.cerradoAt
                    ? new Date(a.cerradoAt).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
