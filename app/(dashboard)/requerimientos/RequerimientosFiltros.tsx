"use client";

import { useRouter, usePathname } from "next/navigation";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "NUEVO", label: "Nuevo" },
  { value: "EN_PROGRESO", label: "En progreso" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "CERRADO", label: "Cerrado" },
];

const CATEGORIAS = [
  { value: "", label: "Todas" },
  { value: "ILUMINACION", label: "Iluminación" },
  { value: "PODA", label: "Poda" },
  { value: "CALLES", label: "Calles" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura" },
  { value: "OTRO", label: "Otro" },
];

interface Props {
  estadoActivo?: string;
  categoriaActiva?: string;
  soloMios: boolean;
  userRole: string;
}

export default function RequerimientosFiltros({
  estadoActivo,
  categoriaActiva,
  soloMios,
  userRole,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.estado) sp.set("estado", params.estado);
    if (params.categoria) sp.set("categoria", params.categoria);
    if (params.mine === "true") sp.set("mine", "true");
    const query = sp.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setEstado(v: string) {
    navigate({
      estado: v || undefined,
      categoria: categoriaActiva || undefined,
      mine: soloMios ? "true" : undefined,
    });
  }

  function setCategoria(v: string) {
    navigate({
      estado: estadoActivo || undefined,
      categoria: v || undefined,
      mine: soloMios ? "true" : undefined,
    });
  }

  function toggleMios() {
    navigate({
      estado: estadoActivo || undefined,
      categoria: categoriaActiva || undefined,
      mine: !soloMios ? "true" : undefined,
    });
  }

  return (
    <div className="mb-5 space-y-3">
      {/* Tabs de estado */}
      <div className="flex gap-1.5 flex-wrap">
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            onClick={() => setEstado(e.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (estadoActivo ?? "") === e.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Fila inferior: categoría + "solo los míos" */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={categoriaActiva ?? ""}
          onChange={(e) => setCategoria(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          onClick={toggleMios}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            soloMios
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Solo los míos
        </button>
      </div>
    </div>
  );
}
