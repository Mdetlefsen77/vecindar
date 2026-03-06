"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Rol } from "@prisma/client";

const ROLES: Rol[] = ["VECINO", "REFERENTE_MANZANA", "SEGURIDAD", "ADMIN"];
const ROL_LABEL: Record<Rol, string> = {
  VECINO: "Vecino",
  REFERENTE_MANZANA: "Referente de manzana",
  SEGURIDAD: "Seguridad / Guardia",
  ADMIN: "Administrador",
};

interface Props {
  usuarioId: number;
  rolActual: Rol;
  verificado: boolean;
  esUnoMismo: boolean;
}

export default function AccionesUsuario({
  usuarioId,
  rolActual,
  verificado,
  esUnoMismo,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset password
  const [showReset, setShowReset] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");

  async function patch(body: Record<string, unknown>, msg: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setSuccess(msg);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Feedback */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✅ {success}
        </p>
      )}

      {/* Verificación */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800">Acceso al barrio</h3>
        <p className="text-sm text-gray-500">
          Estado actual:{" "}
          <span
            className={`font-medium ${verificado ? "text-green-600" : "text-amber-600"}`}
          >
            {verificado ? "Activo" : "Pendiente de aprobación"}
          </span>
        </p>
        <div className="flex gap-2 flex-wrap">
          {!verificado && (
            <button
              disabled={loading || esUnoMismo}
              onClick={() => patch({ verificado: true }, "Usuario aprobado.")}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              ✅ Aprobar acceso
            </button>
          )}
          {verificado && (
            <button
              disabled={loading || esUnoMismo}
              onClick={() => patch({ verificado: false }, "Acceso suspendido.")}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              🚫 Suspender acceso
            </button>
          )}
        </div>
        {esUnoMismo && (
          <p className="text-xs text-gray-400">
            No podés modificar tu propio acceso.
          </p>
        )}
      </div>

      {/* Cambiar rol */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800">Rol</h3>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              disabled={loading || r === rolActual || esUnoMismo}
              onClick={() =>
                patch({ rol: r }, `Rol cambiado a ${ROL_LABEL[r]}.`)
              }
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                r === rolActual
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              }`}
            >
              {ROL_LABEL[r]}
            </button>
          ))}
        </div>
        {esUnoMismo && (
          <p className="text-xs text-gray-400">
            No podés cambiar tu propio rol.
          </p>
        )}
      </div>

      {/* Reset contraseña */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800">Restablecer contraseña</h3>
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Establecer nueva contraseña →
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              disabled={loading || nuevaPassword.length < 6}
              onClick={() => {
                patch({ nuevaPassword }, "Contraseña actualizada.").then(() => {
                  setShowReset(false);
                  setNuevaPassword("");
                });
              }}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Guardar
            </button>
            <button
              onClick={() => setShowReset(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
