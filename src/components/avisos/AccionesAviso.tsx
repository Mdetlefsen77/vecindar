"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Confirmacion = "SIGUE" | "RESUELTO";

/**
 * Botones de un aviso. Vecinos: "Sigue pasando" / "Ya se resolvió". Autor:
 * "Ya se resolvió" (lo cierra) y borrar. Gestor: borrar.
 */
export default function AccionesAviso({
  avisoId,
  esAutor,
  puedeBorrar,
  miConfirmacion,
}: {
  avisoId: number;
  esAutor: boolean;
  puedeBorrar: boolean;
  miConfirmacion: Confirmacion | null;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function confirmar(tipo: Confirmacion) {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/avisos/${avisoId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "No se pudo registrar.");
      if (d.resuelto) setAviso("¡Gracias! El aviso quedó como resuelto.");
      router.refresh();
    } catch {
      setError("Ocurrió un error de red.");
    } finally {
      setCargando(false);
    }
  }

  async function borrar() {
    if (!confirm("¿Borrar este aviso?")) return;
    setCargando(true);
    const res = await fetch(`/api/avisos/${avisoId}`, { method: "DELETE" }).catch(
      () => null,
    );
    setCargando(false);
    if (!res?.ok) return setError("No se pudo borrar el aviso.");
    router.refresh();
  }

  if (aviso) {
    return (
      <p role="status" className="text-sm text-green-700">
        {aviso}
      </p>
    );
  }

  const boton = (activo: boolean) =>
    `min-h-[40px] px-3 py-1.5 rounded-lg border text-sm font-semibold disabled:opacity-60 ${
      activo
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-gray-300 text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {!esAutor && (
          <button
            type="button"
            onClick={() => confirmar("SIGUE")}
            disabled={cargando}
            aria-pressed={miConfirmacion === "SIGUE"}
            className={boton(miConfirmacion === "SIGUE")}
          >
            👀 Sigue pasando
          </button>
        )}
        <button
          type="button"
          onClick={() => confirmar("RESUELTO")}
          disabled={cargando}
          aria-pressed={miConfirmacion === "RESUELTO"}
          className={boton(miConfirmacion === "RESUELTO")}
        >
          ✅ Ya se resolvió
        </button>
        {puedeBorrar && (
          <button
            type="button"
            onClick={borrar}
            disabled={cargando}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
          >
            Borrar
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
