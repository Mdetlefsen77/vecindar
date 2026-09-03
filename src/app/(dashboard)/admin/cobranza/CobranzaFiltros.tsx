"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "al_dia", label: "Al día" },
  { value: "vencida", label: "Vencidos" },
  { value: "sin_datos", label: "Sin datos" },
  { value: "exento", label: "Exentos" },
];

export default function CobranzaFiltros() {
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
  const estado = searchParams.get("estado") ?? "";

  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="search"
        placeholder="Buscar nombre, apellido o email..."
        defaultValue={q}
        onChange={(e) => update("q", e.target.value)}
        className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
        {ESTADOS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("estado", opt.value)}
            className={`px-3 py-2 transition-colors ${
              estado === opt.value
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
