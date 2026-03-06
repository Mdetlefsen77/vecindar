"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ESTADOS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "FALSA_ALARMA", label: "Falsa alarma" },
];

interface Props {
  incidenteId: number;
  estadoActual: string;
  visibleVecinos: boolean;
}

export default function CambiarEstadoIncidente({
  incidenteId,
  estadoActual,
  visibleVecinos,
}: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoActual);
  const [visible, setVisible] = useState(visibleVecinos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function patch(data: object) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/incidentes/${incidenteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al actualizar.");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function cambiarEstado(nuevoEstado: string) {
    if (nuevoEstado === estado) return;
    setEstado(nuevoEstado);
    patch({ estado: nuevoEstado });
  }

  function toggleVisibilidad() {
    const nuevoVisible = !visible;
    setVisible(nuevoVisible);
    patch({ visibleVecinos: nuevoVisible });
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wide">
        Panel de administración
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Estado:</p>
          <div className="flex gap-2 flex-wrap">
            {ESTADOS.map((e) => (
              <button
                key={e.value}
                onClick={() => cambiarEstado(e.value)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 ${
                  estado === e.value
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-amber-400"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Visible para vecinos
            </p>
            <p className="text-xs text-gray-400">
              Si está desactivado, solo admins lo ven
            </p>
          </div>
          <button
            onClick={toggleVisibilidad}
            disabled={loading}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
              visible ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                visible ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
