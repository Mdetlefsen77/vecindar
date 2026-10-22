"use client";

import { useEffect } from "react";
import L from "leaflet";
import { escapeHtml } from "./html";

export interface IncidentePin {
  id: number;
  tipo: string;
  estado: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  fechaHora: string;
  lote?: { numero: string; manzana: { numero: string } } | null;
}

interface IncidentesLayerProps {
  map: L.Map | null;
  incidentes: IncidentePin[];
  onPinClick?: (incidente: IncidentePin) => void;
}

// ── Config visual por tipo ────────────────────────────────────────────────────
const TIPO_CONFIG: Record<
  string,
  { color: string; emoji: string; label: string }
> = {
  ROBO: { color: "#dc2626", emoji: "🔴", label: "Robo" },
  ROBO_TENTATIVA: { color: "#ea580c", emoji: "🟠", label: "Intento de robo" },
  SOSPECHOSO: { color: "#d97706", emoji: "🟡", label: "Sospechoso" },
  VANDALISMO: { color: "#7c3aed", emoji: "🟣", label: "Vandalismo" },
  OTRO: { color: "#6b7280", emoji: "⚫", label: "Otro" },
};

function crearPinIcon(tipo: string, estado: string) {
  const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.OTRO;
  const resuelto = estado !== "ACTIVO";
  const opacity = resuelto ? "0.45" : "1";
  const color = resuelto ? "#9ca3af" : cfg.color;

  return L.divIcon({
    html: `<div style="
            width:32px; height:32px; border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:${color}; opacity:${opacity};
            border:2px solid rgba(255,255,255,0.8);
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
            display:flex; align-items:center; justify-content:center;">
            <span style="transform:rotate(45deg); font-size:14px; line-height:1;">
                ${resuelto ? "✓" : cfg.emoji.replace(/[🔴🟠🟡🟣⚫]/u, "")}
            </span>
        </div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

export default function IncidentesLayer({
  map,
  incidentes,
  onPinClick,
}: IncidentesLayerProps) {
  useEffect(() => {
    const mapWithContainer = map as
      | (L.Map & { _container?: HTMLElement })
      | null;
    if (!mapWithContainer?._container) return;

    const markers: L.Marker[] = [];

    incidentes.forEach((inc) => {
      if (inc.latitud == null || inc.longitud == null) return;

      const cfg = TIPO_CONFIG[inc.tipo] ?? TIPO_CONFIG.OTRO;
      const loteInfo = inc.lote
        ? `Manzana ${escapeHtml(inc.lote.manzana.numero)} · Lote ${escapeHtml(inc.lote.numero)}`
        : "";

      const marker = L.marker([inc.latitud, inc.longitud], {
        icon: crearPinIcon(inc.tipo, inc.estado),
      });

      const descripcion =
        inc.descripcion.length > 100
          ? inc.descripcion.slice(0, 100) + "…"
          : inc.descripcion;
      const resuelto = inc.estado !== "ACTIVO";
      marker.bindPopup(
        `
                <div style="min-width:200px; padding:3px 2px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:20px;">${cfg.emoji}</span>
                        <span style="font-weight:700; font-size:17px; color:#111827;">${cfg.label}</span>
                        ${resuelto ? `<span style="font-size:13px; font-weight:600; color:#15803d;">✓ Resuelto</span>` : ""}
                    </div>
                    <p style="margin:0 0 6px; font-size:15px; color:#374151; line-height:1.4;">
                        ${escapeHtml(descripcion)}
                    </p>
                    ${loteInfo ? `<p style="margin:0 0 4px; font-size:14px; color:#4b5563;">${loteInfo}</p>` : ""}
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:8px;">
                        <span style="font-size:14px; color:#4b5563;">
                            ${new Date(inc.fechaHora).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </span>
                        <a href="/incidentes/${inc.id}"
                           style="font-size:15px; font-weight:700; color:#1d4ed8; text-decoration:none; padding:6px 0;">
                            Ver detalle →
                        </a>
                    </div>
                </div>
            `,
        { maxWidth: 280 },
      );
      marker.on("click", () => onPinClick?.(inc));
      marker.addTo(map!);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => map?.removeLayer(m));
    };
  }, [map, incidentes, onPinClick]);

  return null;
}
