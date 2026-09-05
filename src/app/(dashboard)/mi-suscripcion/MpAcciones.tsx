"use client";

import { useState } from "react";

type Tipo = "pago" | "preapproval";

/**
 * Botones de MercadoPago en "Mi suscripción". Piden al backend un link de
 * checkout (pago del período actual o alta de débito automático) y redirigen
 * al vecino a MercadoPago. Solo se monta si MercadoPago está configurado.
 */
export default function MpAcciones({
  periodoActualLabel,
  periodoActualPagado,
  preapprovalEstado,
}: {
  periodoActualLabel: string;
  periodoActualPagado: boolean;
  preapprovalEstado: string | null;
}) {
  const [cargando, setCargando] = useState<Tipo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ir(tipo: Tipo) {
    setCargando(tipo);
    setError(null);
    try {
      const res = await fetch("/api/cobranza/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo iniciar el pago. Probá de nuevo.");
        setCargando(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Error de conexión. Probá de nuevo.");
      setCargando(null);
    }
  }

  const activo = preapprovalEstado === "authorized";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="font-bold text-gray-900">Pagar online</h2>
      <p className="mt-1 text-sm text-gray-500">
        Con tarjeta o saldo de tu cuenta de MercadoPago.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {periodoActualPagado ? (
          <p className="text-sm text-gray-500">
            {periodoActualLabel} ya está pago. ¡Gracias!
          </p>
        ) : (
          <button
            onClick={() => ir("pago")}
            disabled={cargando !== null}
            className="min-h-[40px] px-4 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {cargando === "pago"
              ? "Abriendo MercadoPago…"
              : `Pagar ${periodoActualLabel}`}
          </button>
        )}

        {activo ? (
          <p className="text-sm font-medium text-green-700">
            ✓ Débito automático mensual activo
          </p>
        ) : (
          <button
            onClick={() => ir("preapproval")}
            disabled={cargando !== null}
            className="min-h-[40px] px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm font-semibold transition-colors"
          >
            {cargando === "preapproval"
              ? "Abriendo MercadoPago…"
              : "Activar débito automático mensual"}
          </button>
        )}
      </div>

      {preapprovalEstado && preapprovalEstado !== "authorized" && (
        <p className="mt-2 text-xs text-gray-500">
          Débito automático: {preapprovalEstado}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
