"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nombreCompleto } from "@/lib/usuarios";

export interface ComentarioAlertaData {
  id: number;
  texto: string;
  createdAt: string;
  usuario: { id: number; nombre: string; apellido: string; rol: string };
}

interface Props {
  alertaId: number;
  comentarios: ComentarioAlertaData[];
  cerrada: boolean;
  /**
   * Si se pasa, se usa para actualizar el estado local al instante (BotonSOS,
   * que mantiene su propio estado vía polling). Si no, se usa router.refresh()
   * (panel de admin, que ya depende de eso para el resto de las acciones).
   */
  onNuevoComentario?: (comentario: ComentarioAlertaData) => void;
}

export default function ComentariosAlerta({
  alertaId,
  comentarios,
  cerrada,
  onNuevoComentario,
}: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/panico/${alertaId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar.");

      setTexto("");
      if (onNuevoComentario) {
        onNuevoComentario(data as ComentarioAlertaData);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 w-full">
      {comentarios.length > 0 && (
        <div className="space-y-2">
          {comentarios.map((c) => {
            const esStaff =
              c.usuario.rol === "ADMIN" || c.usuario.rol === "SEGURIDAD";
            return (
              <div
                key={c.id}
                className={`rounded-xl px-3 py-2 text-left text-sm ${
                  esStaff
                    ? "bg-blue-50 border border-blue-100"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <p className={esStaff ? "text-blue-900" : "text-gray-800"}>
                  {c.texto}
                </p>
                <p
                  className={`text-xs mt-0.5 ${esStaff ? "text-blue-400" : "text-gray-400"}`}
                >
                  — {nombreCompleto(c.usuario)}
                  {esStaff ? " (equipo)" : ""} ·{" "}
                  {new Date(c.createdAt).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!cerrada && (
        <form onSubmit={enviar} className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribir un mensaje..."
            disabled={loading}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !texto.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors shrink-0"
          >
            {loading ? "..." : "Enviar"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
