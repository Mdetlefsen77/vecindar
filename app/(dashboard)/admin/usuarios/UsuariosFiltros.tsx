"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ROLES = [
  { value: "", label: "Todos los roles" },
  { value: "VECINO", label: "Vecino" },
  { value: "REFERENTE_MANZANA", label: "Referente" },
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "ADMIN", label: "Admin" },
];

export default function UsuariosFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const q = searchParams.get("q") ?? "";
  const rol = searchParams.get("rol") ?? "";
  const verificado = searchParams.get("verificado") ?? "";

  return (
    <div className="flex flex-wrap gap-2">
      {/* Búsqueda */}
      <input
        type="search"
        placeholder="Buscar nombre o email..."
        defaultValue={q}
        onChange={(e) => update("q", e.target.value)}
        className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Rol */}
      <select
        value={rol}
        onChange={(e) => update("rol", e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {/* Verificado */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
        {[
          { value: "", label: "Todos" },
          { value: "true", label: "Activos" },
          { value: "false", label: "Pendientes" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("verificado", opt.value)}
            className={`px-3 py-2 transition-colors ${
              verificado === opt.value
                ? "bg-blue-600 text-white font-medium"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
