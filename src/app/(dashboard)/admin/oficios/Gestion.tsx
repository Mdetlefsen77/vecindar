"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRUPO_OFICIO, ORDEN_GRUPOS } from "@/lib/oficios";
import type { GrupoOficio } from "@/generated/enums";

export function ResolverReporte({ reporteId }: { reporteId: number }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  return (
    <button
      type="button"
      disabled={cargando}
      onClick={async () => {
        setCargando(true);
        await fetch(`/api/oficios/reportes/${reporteId}`, { method: "PATCH" });
        router.refresh();
      }}
      className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      Marcar resuelto
    </button>
  );
}

interface Categoria {
  id: number;
  nombre: string;
  grupo: GrupoOficio;
  activa: boolean;
  enUso: number;
}

/** Alta de rubros y activar/desactivar los existentes. */
export function CategoriasAdmin({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState<GrupoOficio>("HOGAR");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const res = await fetch("/api/oficios/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, grupo }),
    });
    const d = await res.json().catch(() => ({}));
    setCargando(false);
    if (!res.ok) return setError(d.error ?? "No se pudo crear el rubro.");
    setNombre("");
    router.refresh();
  }

  async function alternar(c: Categoria) {
    await fetch(`/api/oficios/categorias/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !c.activa }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={crear} className="flex flex-col sm:flex-row gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nuevo rubro (ej. Afilado de cuchillos)"
          aria-label="Nombre del nuevo rubro"
          required
          maxLength={60}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as GrupoOficio)}
          aria-label="Grupo del nuevo rubro"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {ORDEN_GRUPOS.map((g) => (
            <option key={g} value={g}>
              {GRUPO_OFICIO[g].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={cargando}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
        >
          Agregar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {ORDEN_GRUPOS.map((g) => {
          const delGrupo = categorias.filter((c) => c.grupo === g);
          if (delGrupo.length === 0) return null;
          return (
            <details key={g} className="rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-gray-800">
                {GRUPO_OFICIO[g].emoji} {GRUPO_OFICIO[g].label}{" "}
                <span className="font-normal text-gray-500">({delGrupo.length})</span>
              </summary>
              <ul className="divide-y divide-gray-100 px-4 pb-2">
                {delGrupo.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span
                      className={`text-sm ${c.activa ? "text-gray-800" : "text-gray-400 line-through"}`}
                    >
                      {c.nombre}
                      {c.enUso > 0 && (
                        <span className="text-xs text-gray-500 no-underline">
                          {" "}
                          · {c.enUso} en uso
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => alternar(c)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {c.activa ? "Desactivar" : "Activar"}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
