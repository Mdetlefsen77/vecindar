"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NivelReporte } from "@/lib/reportes/tipos";

interface Props {
  anio: number;
  mes: number;
  nivel: NivelReporte;
  archivado: { numero: number; generadoAt: string; nota: string | null } | null;
}

// HU-06/HU-07 — archivar congela el ReporteModelo actual con número
// correlativo; recalcular emite uno nuevo sin pisar el anterior (§7.2).
export default function ArchivarReporteForm({
  anio,
  mes,
  nivel,
  archivado,
}: Props) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const archivar = async (forzarRecalculo = false) => {
    if (
      forzarRecalculo &&
      !window.confirm(
        "Esto va a generar un reporte NUEVO con número propio, sin borrar el archivado actual. ¿Continuar?",
      )
    ) {
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/reportes/archivar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anio,
          mes,
          nivel,
          nota: nota || undefined,
          forzarRecalculo,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo archivar el reporte.");
        return;
      }
      router.refresh();
    } finally {
      setCargando(false);
    }
  };

  if (archivado) {
    return (
      <div className="print:hidden flex flex-col items-end gap-1 text-right">
        <p className="text-xs text-gray-500">
          Reporte N° {String(archivado.numero).padStart(4, "0")} — archivado el{" "}
          {new Date(archivado.generadoAt).toLocaleString("es-AR")}
        </p>
        <button
          onClick={() => archivar(true)}
          disabled={cargando}
          className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
        >
          {cargando ? "Generando…" : "Generar de nuevo (número nuevo)"}
        </button>
      </div>
    );
  }

  return (
    <div className="print:hidden flex flex-col items-end gap-2 max-w-xs">
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota del período (opcional) — aparece en el resumen ejecutivo"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={() => archivar(false)}
        disabled={cargando}
        className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
      >
        {cargando ? "Archivando…" : "Archivar este reporte"}
      </button>
    </div>
  );
}
