"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function MascotasFiltros() {
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

  const tipo = searchParams.get("tipo") ?? "";
  const estado = searchParams.get("estado") ?? "";

  return (
    <div className="flex flex-wrap gap-2">
      {/* Tipo */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
        {[
          { value: "", label: "Todos" },
          { value: "PERDIDA", label: "🐾 Perdida" },
          { value: "ENCONTRADA", label: "✅ Encontrada" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("tipo", opt.value)}
            className={`px-3 py-2 transition-colors ${
              tipo === opt.value
                ? "bg-blue-600 text-white font-medium"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Estado */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
        {[
          { value: "", label: "Todos" },
          { value: "abierta", label: "🔍 Buscando" },
          { value: "resuelta", label: "✅ Resueltas" },
        ].map((opt) => (
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
