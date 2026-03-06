"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  mascotaId: number;
  estadoActual: boolean; // true = abierta
  esDuenio: boolean;
  esAdmin: boolean;
}

export default function AccionesMascota({
  mascotaId,
  estadoActual,
  esDuenio,
  esAdmin,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!esDuenio && !esAdmin) return null;

  async function cambiarEstado(nuevoEstado: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mascotas/${mascotaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar.");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 text-sm">Acciones</h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {estadoActual ? (
        <button
          disabled={loading}
          onClick={() => cambiarEstado(false)}
          className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          ✅ Marcar como resuelta
        </button>
      ) : (
        <button
          disabled={loading}
          onClick={() => cambiarEstado(true)}
          className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          🔄 Reabrir alerta
        </button>
      )}
    </div>
  );
}
