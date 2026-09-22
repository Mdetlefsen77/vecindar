"use client";

import { useState } from "react";

interface YaCompartidoInfo {
  publicadaPorNombre: string | null;
  creadaAt: string;
}

interface Props {
  tipoEvento: "INCIDENTE" | "REQUERIMIENTO" | "MASCOTA";
  entidadId: number;
  /** Si el servidor ya sabe que se compartió, se muestra sin esperar un click. */
  yaCompartidoInicial?: YaCompartidoInfo | null;
}

type Estado =
  | { tipo: "inicial" }
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "compartido" }
  | { tipo: "yaCompartido"; info: YaCompartidoInfo };

function formatoFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// HU-07 — botón "Compartir en el grupo". Solo se monta para quien ya
// gestiona ese tipo de entidad (lo decide la página que lo usa); el servidor
// vuelve a exigirlo en /api/notificaciones-externas/compartir.
export default function CompartirBoton({
  tipoEvento,
  entidadId,
  yaCompartidoInicial,
}: Props) {
  const [estado, setEstado] = useState<Estado>(
    yaCompartidoInicial
      ? { tipo: "yaCompartido", info: yaCompartidoInicial }
      : { tipo: "inicial" },
  );

  const compartir = async () => {
    setEstado({ tipo: "cargando" });
    try {
      const res = await fetch("/api/notificaciones-externas/compartir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoEvento, entidadId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEstado({
          tipo: "error",
          mensaje: data.error ?? "No se pudo compartir.",
        });
        return;
      }

      if (!data.ok) {
        setEstado({
          tipo: "yaCompartido",
          info: {
            publicadaPorNombre: data.yaCompartido?.publicadaPorNombre ?? null,
            creadaAt: data.yaCompartido?.creadaAt ?? new Date().toISOString(),
          },
        });
        return;
      }

      setEstado({ tipo: "compartido" });

      // Mismo patrón que InvitarVecino.tsx: Web Share nativo con fallback a
      // wa.me — ninguno de los dos puede preseleccionar el grupo, lo elige
      // quien comparte (CA-07.2).
      if (navigator.share) {
        try {
          await navigator.share({ text: data.mensaje });
        } catch {
          // el usuario canceló el share nativo — no es un error a mostrar
        }
        return;
      }
      window.open(
        `https://wa.me/?text=${encodeURIComponent(data.mensaje)}`,
        "_blank",
      );
    } catch {
      setEstado({ tipo: "error", mensaje: "Ocurrió un error de red." });
    }
  };

  if (estado.tipo === "yaCompartido") {
    return (
      <p className="text-sm text-gray-500">
        Ya se compartió en WhatsApp
        {estado.info.publicadaPorNombre
          ? ` — por ${estado.info.publicadaPorNombre}`
          : ""}{" "}
        el {formatoFecha(estado.info.creadaAt)}.
      </p>
    );
  }

  if (estado.tipo === "compartido") {
    return (
      <p className="text-sm font-medium text-green-600">
        Compartido ✓ — se abrió WhatsApp para elegir el grupo.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={compartir}
        disabled={estado.tipo === "cargando"}
        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
      >
        {estado.tipo === "cargando"
          ? "Generando link…"
          : "📤 Compartir en el grupo"}
      </button>
      {estado.tipo === "error" && (
        <p className="text-sm text-red-600">{estado.mensaje}</p>
      )}
    </div>
  );
}
