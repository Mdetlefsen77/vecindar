"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type EstadoAlerta } from "@/generated/enums";
import ComentariosAlerta, {
  type ComentarioAlertaData,
} from "./ComentariosAlerta";

interface Props {
  alertaId: number;
  estadoActual: EstadoAlerta;
  comentarios: ComentarioAlertaData[];
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
  comentarios,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      {/* Conversación con el vecino */}
      <ComentariosAlerta
        alertaId={alertaId}
        comentarios={comentarios}
        cerrada={cerrada}
      />
    </div>
  );
}
