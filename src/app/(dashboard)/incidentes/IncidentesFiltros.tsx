"use client";

import { useRouter, usePathname } from "next/navigation";

const TIPOS = [
  { value: "", label: "Todos" },
  { value: "ROBO", label: "Robo" },
  { value: "ROBO_TENTATIVA", label: "Intento" },
  { value: "SOSPECHOSO", label: "Sospechoso" },
  { value: "VANDALISMO", label: "Vandalismo" },
  { value: "OTRO", label: "Otro" },
];

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "ACTIVO", label: "Activo" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "FALSA_ALARMA", label: "Falsa alarma" },
];

const DIAS_OPTIONS = [7, 30, 90];

const PRIORIDADES = [
  { value: "", label: "Todas" },
  { value: "CRITICO", label: "Crítico" },
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Medio" },
  { value: "BAJO", label: "Bajo" },
];

interface Props {
  tipoActivo?: string;
  estadoActivo?: string;
  prioridadActiva?: string;
  diasActivo: number;
}

export default function IncidentesFiltros({
  tipoActivo,
  estadoActivo,
  prioridadActiva,
  diasActivo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(params: {
    tipo?: string;
    estado?: string;
    prioridad?: string;
    dias?: number;
  }) {
    const sp = new URLSearchParams();
    if (params.tipo) sp.set("tipo", params.tipo);
    if (params.estado) sp.set("estado", params.estado);
    if (params.prioridad) sp.set("prioridad", params.prioridad);
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
                prioridad: prioridadActiva || undefined,
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

      {/* Estado */}
      <div className="flex gap-1.5 flex-wrap">
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            onClick={() =>
              navigate({
                tipo: tipoActivo || undefined,
                estado: e.value || undefined,
                prioridad: prioridadActiva || undefined,
                dias: diasActivo,
              })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (estadoActivo ?? "") === e.value
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Período */}
      <div className="flex gap-1.5">
        {DIAS_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() =>
              navigate({
                tipo: tipoActivo || undefined,
                estado: estadoActivo || undefined,
                prioridad: prioridadActiva || undefined,
                dias: d,
              })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              diasActivo === d
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>
      {/* Prioridad */}
      <div className="flex gap-1.5 flex-wrap">
        {PRIORIDADES.map((p) => (
          <button
            key={p.value}
            onClick={() =>
              navigate({
                tipo: tipoActivo || undefined,
                estado: estadoActivo || undefined,
                prioridad: p.value || undefined,
                dias: diasActivo,
              })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (prioridadActiva ?? "") === p.value
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-red-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
