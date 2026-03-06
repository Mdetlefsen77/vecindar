"use client";

import { useRouter, usePathname } from "next/navigation";

const TIPOS = [
  { value: "", label: "Todos" },
  { value: "ROBO", label: "🔴 Robo" },
  { value: "ROBO_TENTATIVA", label: "🟠 Intento" },
  { value: "SOSPECHOSO", label: "🟡 Sospechoso" },
  { value: "VANDALISMO", label: "🟣 Vandalismo" },
  { value: "OTRO", label: "⚫ Otro" },
];

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "ACTIVO", label: "Activo" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "FALSA_ALARMA", label: "Falsa alarma" },
];

const DIAS_OPTIONS = [7, 30, 90];

interface Props {
  tipoActivo?: string;
  estadoActivo?: string;
  diasActivo: number;
}

export default function IncidentesFiltros({
  tipoActivo,
  estadoActivo,
  diasActivo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(params: { tipo?: string; estado?: string; dias?: number }) {
    const sp = new URLSearchParams();
    if (params.tipo) sp.set("tipo", params.tipo);
    if (params.estado) sp.set("estado", params.estado);
    if (params.dias && params.dias !== 30) sp.set("dias", String(params.dias));
    const q = sp.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Tipos */}
      <div className="flex gap-1.5 flex-wrap">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() =>
              navigate({
                tipo: t.value || undefined,
                estado: estadoActivo || undefined,
                dias: diasActivo,
              })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (tipoActivo ?? "") === t.value
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Estado + período */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={estadoActivo ?? ""}
          onChange={(e) =>
            navigate({
              tipo: tipoActivo || undefined,
              estado: e.target.value || undefined,
              dias: diasActivo,
            })
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {DIAS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() =>
                navigate({
                  tipo: tipoActivo || undefined,
                  estado: estadoActivo || undefined,
                  dias: d,
                })
              }
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                diasActivo === d
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
