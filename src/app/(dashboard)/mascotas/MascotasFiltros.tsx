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
    <div className="space-y-2">
      {/* Tipo */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "", label: "Todos" },
          { value: "PERDIDA", label: "Perdida" },
          { value: "ENCONTRADA", label: "Encontrada" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("tipo", opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tipo === opt.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Estado */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "", label: "Todos" },
          { value: "abierta", label: "Buscando" },
          { value: "resuelta", label: "Resueltas" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("estado", opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              estado === opt.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
