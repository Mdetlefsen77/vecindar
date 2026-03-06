"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ESTADOS = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "EN_PROGRESO", label: "En progreso" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "CERRADO", label: "Cerrado" },
];

interface Props {
  requerimientoId: number;
  estadoActual: string;
}

export default function CambiarEstado({
  requerimientoId,
  estadoActual,
}: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoActual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(nuevoEstado: string) {
    if (nuevoEstado === estado) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/requerimientos/${requerimientoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al actualizar el estado.");
      }
      setEstado(nuevoEstado);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
        Panel de administración
      </p>
      <p className="text-sm text-gray-700 mb-3 font-medium">Cambiar estado:</p>
      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            onClick={() => handleChange(e.value)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 ${
              estado === e.value
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-700"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
