"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type EstadoAlerta } from "@prisma/client";

interface Props {
  alertaId: number;
  estadoActual: EstadoAlerta;
  notasActuales: string | null;
}

const SIGUIENTE_ESTADO: Partial<Record<EstadoAlerta, EstadoAlerta>> = {
  ENVIADO: "RECIBIDO",
  RECIBIDO: "EN_ATENCION",
  EN_ATENCION: "CERRADO",
};

const BOTON_LABEL: Partial<Record<EstadoAlerta, string>> = {
  ENVIADO: "✅ Marcar como recibida",
  RECIBIDO: "🚔 Marcar en atención",
  EN_ATENCION: "🔒 Cerrar alerta",
};

const BOTON_COLOR: Partial<Record<EstadoAlerta, string>> = {
  ENVIADO: "bg-orange-500 hover:bg-orange-600 text-white",
  RECIBIDO: "bg-blue-600 hover:bg-blue-700 text-white",
  EN_ATENCION: "bg-green-600 hover:bg-green-700 text-white",
};

export default function AccionesAlerta({
  alertaId,
  estadoActual,
  notasActuales,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState(notasActuales ?? "");
  const [editandoNotas, setEditandoNotas] = useState(false);

  const siguienteEstado = SIGUIENTE_ESTADO[estadoActual];
  const cerrada = estadoActual === "CERRADO";

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/panico/${alertaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <div className="space-y-3 pt-3 border-t border-gray-100">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Avanzar estado */}
      {!cerrada && siguienteEstado && (
        <button
          disabled={loading}
          onClick={() => patch({ estado: siguienteEstado })}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors ${BOTON_COLOR[estadoActual]}`}
        >
          {loading ? "Actualizando..." : BOTON_LABEL[estadoActual]}
        </button>
      )}

      {/* Notas */}
      {!cerrada && (
        <div>
          {!editandoNotas ? (
            <button
              onClick={() => setEditandoNotas(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              {notas
                ? "✏️ Editar mensaje al vecino"
                : "💬 Enviar mensaje al vecino"}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                placeholder="Mensaje para el vecino (ej: Ya estamos en camino...)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() =>
                    patch({ notas }).then(() => setEditandoNotas(false))
                  }
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditandoNotas(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {notas && !editandoNotas && (
            <p className="text-xs text-gray-500 mt-1 italic">"{notas}"</p>
          )}
        </div>
      )}
    </div>
  );
}
