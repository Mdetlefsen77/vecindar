"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type EstadoAlerta = "ENVIADO" | "RECIBIDO" | "EN_ATENCION" | "CERRADO";

interface AlertaActiva {
  id: number;
  estado: EstadoAlerta;
  createdAt: string;
  notas: string | null;
  atendioPor: { nombre: string } | null;
}

const ESTADO_INFO: Record<
  EstadoAlerta,
  { label: string; color: string; bg: string; desc: string }
> = {
  ENVIADO: {
    label: "Alerta enviada",
    color: "text-red-700",
    bg: "bg-red-100 border-red-300",
    desc: "Tu alerta fue enviada. Esperando que el equipo de seguridad la reciba...",
  },
  RECIBIDO: {
    label: "Recibida",
    color: "text-orange-700",
    bg: "bg-orange-100 border-orange-300",
    desc: "El equipo de seguridad recibió tu alerta y está actuando.",
  },
  EN_ATENCION: {
    label: "En atención",
    color: "text-blue-700",
    bg: "bg-blue-100 border-blue-300",
    desc: "Están en camino o ya están atendiendo la situación.",
  },
  CERRADO: {
    label: "Cerrada",
    color: "text-green-700",
    bg: "bg-green-100 border-green-300",
    desc: "La alerta fue cerrada.",
  },
};

const HOLD_DURATION = 2000; // ms

interface Props {
  alertaActivaInicial: AlertaActiva | null;
}

export default function BotonSOS({ alertaActivaInicial }: Props) {
  const [alerta, setAlerta] = useState<AlertaActiva | null>(
    alertaActivaInicial,
  );
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling mientras la alerta esté activa y no cerrada
  const startPolling = useCallback((alertaId: number) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/panico");
        if (!res.ok) return;
        const data: AlertaActiva[] = await res.json();
        const updated = data.find((a) => a.id === alertaId);
        if (updated) {
          setAlerta(updated);
          if (updated.estado === "CERRADO") stopPolling();
        }
      } catch {
        // silencioso
      }
    }, 5000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (alerta && alerta.estado !== "CERRADO") {
      startPolling(alerta.id);
    }
    return stopPolling;
  }, [alerta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Iniciar hold
  const handlePointerDown = useCallback(() => {
    if (sending || alerta) return;
    setHolding(true);
    holdTimerRef.current = setTimeout(async () => {
      setHolding(false);
      setSending(true);
      setError(null);

      // Geolocalización
      let lat = 0;
      let lon = 0;
      try {
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 60000,
            });
          },
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // Si no hay permiso de geolocalización, enviamos igual con coords 0,0
      }

      try {
        const res = await fetch("/api/panico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitud: lat, longitud: lon }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data.alerta) {
            setAlerta(data.alerta);
          } else {
            throw new Error(data.error || "Error al enviar.");
          }
        } else {
          setAlerta(data);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al enviar la alerta.");
      } finally {
        setSending(false);
      }
    }, HOLD_DURATION);
  }, [sending, alerta]);

  // Cancelar hold
  const handlePointerUp = useCallback(() => {
    if (!holding) return;
    setHolding(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [holding]);

  // Cancelar alerta activa (solo si ENVIADO)
  async function cancelarAlerta() {
    if (!alerta || alerta.estado !== "ENVIADO") return;
    setCanceling(true);
    try {
      const res = await fetch(`/api/panico/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CERRADO" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAlerta(data);
      stopPolling();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cancelar.");
    } finally {
      setCanceling(false);
    }
  }

  function resetearAlerta() {
    setAlerta(null);
    setError(null);
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  // Estado de alerta activa
  if (alerta) {
    const info = ESTADO_INFO[alerta.estado];
    const cerrada = alerta.estado === "CERRADO";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
        {/* Indicador de estado */}
        <div
          className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${info.bg} ${cerrada ? "" : "animate-pulse"}`}
        >
          <span className="text-5xl">
            {cerrada
              ? "✅"
              : alerta.estado === "EN_ATENCION"
                ? "🚔"
                : alerta.estado === "RECIBIDO"
                  ? "📡"
                  : "🆘"}
          </span>
        </div>

        <div>
          <p className={`text-2xl font-bold ${info.color}`}>{info.label}</p>
          <p className="text-gray-500 text-sm mt-1 max-w-sm">{info.desc}</p>
        </div>

        {/* Notas del administrativo */}
        {alerta.notas && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm w-full text-left">
            <p className="text-xs font-semibold text-blue-500 mb-1">
              Mensaje del equipo
            </p>
            <p className="text-sm text-blue-900">{alerta.notas}</p>
            {alerta.atendioPor && (
              <p className="text-xs text-blue-400 mt-1">
                — {alerta.atendioPor.nombre}
              </p>
            )}
          </div>
        )}

        {/* Cuándo se envió */}
        <p className="text-xs text-gray-400">
          Enviada a las{" "}
          {new Date(alerta.createdAt).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Acciones */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {alerta.estado === "ENVIADO" && (
            <button
              disabled={canceling}
              onClick={cancelarAlerta}
              className="py-3 rounded-xl border-2 border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {canceling ? "Cancelando..." : "Cancelar alerta (falsa alarma)"}
            </button>
          )}
          {cerrada && (
            <button
              onClick={resetearAlerta}
              className="py-3 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              Volver al inicio
            </button>
          )}
        </div>
      </div>
    );
  }

  // Botón de hold
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Botón de pánico</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xs mx-auto">
          Mantené presionado el botón durante 2 segundos para enviar una alerta
          de emergencia al equipo de seguridad.
        </p>
      </div>

      {/* Botón hold */}
      <div
        className="relative select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* SVG ring de progreso */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 128 128"
        >
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="#fee2e2"
            strokeWidth="6"
          />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="#dc2626"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={holding ? 0 : CIRCUMFERENCE}
            style={{
              transition: holding
                ? `stroke-dashoffset ${HOLD_DURATION}ms linear`
                : "stroke-dashoffset 0.15s ease",
            }}
          />
        </svg>

        {/* Círculo rojo */}
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
            holding
              ? "bg-red-700 shadow-[0_0_40px_rgba(220,38,38,0.6)]"
              : "bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
          }`}
          style={{ transform: holding ? "scale(0.93)" : undefined }}
        >
          <span className="text-white font-black text-2xl tracking-widest select-none">
            SOS
          </span>
        </div>
      </div>

      {sending && (
        <p className="text-red-600 font-semibold animate-pulse">
          Enviando alerta...
        </p>
      )}

      {!sending && !holding && (
        <p className="text-gray-400 text-xs">
          Mantené presionado 2 segundos para activar
        </p>
      )}

      {holding && (
        <p className="text-red-600 font-semibold text-sm animate-pulse">
          Soltá para cancelar...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
