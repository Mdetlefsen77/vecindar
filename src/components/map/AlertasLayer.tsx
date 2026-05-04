"use client";

import { useEffect } from "react";
import L from "leaflet";

export interface AlertaPin {
  id: number;
  latitud: number;
  longitud: number;
  estado: string; // ENVIADO | RECIBIDO | EN_ATENCION | CERRADO
  createdAt: string;
  usuario: {
    nombre: string;
    telefono?: string | null;
    lote?: {
      numero: string;
      manzana: { numero: string; zona: string };
    } | null;
  } | null;
}

interface AlertasLayerProps {
  map: L.Map | null;
  alertas: AlertaPin[];
  onPinClick?: (alerta: AlertaPin) => void;
}

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  ENVIADO: { color: "#dc2626", label: "Enviado" },
  RECIBIDO: { color: "#ea580c", label: "Recibido" },
  EN_ATENCION: { color: "#d97706", label: "En atención" },
  CERRADO: { color: "#9ca3af", label: "Cerrado" },
};

function crearAlertaIcon(estado: string): L.DivIcon {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.ENVIADO;
  const activo = estado !== "CERRADO";
  const pulso = activo
    ? `<div style="
        position:absolute; inset:0; border-radius:50%;
        background:${cfg.color}; opacity:0.35;
        animation:sos-pulse 1.4s ease-out infinite;
      "></div>`
    : "";

  return L.divIcon({
    html: `
      <style>
        @keyframes sos-pulse {
          0%   { transform: scale(1);   opacity: 0.35; }
          70%  { transform: scale(2.2); opacity: 0;    }
          100% { transform: scale(2.2); opacity: 0;    }
        }
      </style>
      <div style="position:relative; width:36px; height:36px;">
        ${pulso}
        <div style="
          position:absolute; inset:0; border-radius:50%;
          background:${cfg.color};
          border:2.5px solid rgba(255,255,255,0.9);
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex; align-items:center; justify-content:center;">
          <span style="font-size:16px; line-height:1;">🆘</span>
        </div>
      </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export default function AlertasLayer({
  map,
  alertas,
  onPinClick,
}: AlertasLayerProps) {
  useEffect(() => {
    const mapWithContainer = map as
      | (L.Map & { _container?: HTMLElement })
      | null;
    if (!mapWithContainer?._container) return;

    const markers: L.Marker[] = [];

    alertas.forEach((alerta) => {
      if (alerta.latitud == null || alerta.longitud == null) return;

      const cfg = ESTADO_CONFIG[alerta.estado] ?? ESTADO_CONFIG.ENVIADO;
      const loteInfo = alerta.usuario?.lote
        ? `MZ ${alerta.usuario.lote.manzana.numero} · Lote ${alerta.usuario.lote.numero}`
        : "";

      const marker = L.marker([alerta.latitud, alerta.longitud], {
        icon: crearAlertaIcon(alerta.estado),
        zIndexOffset: 500,
      });

      marker.bindPopup(
        `
        <div style="min-width:160px; padding:3px 2px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            <span style="font-size:18px;">🆘</span>
            <span style="font-weight:700; font-size:14px; color:#dc2626;">Alerta SOS</span>
          </div>
          <p style="margin:0 0 3px; font-size:13px; font-weight:600; color:#111827;">
            ${alerta.usuario?.nombre ?? "Vecino"}
          </p>
          ${alerta.usuario?.telefono ? `<p style="margin:0 0 3px; font-size:12px; color:#374151;">📞 ${alerta.usuario.telefono}</p>` : ""}
          ${loteInfo ? `<p style="margin:0 0 4px; font-size:11px; color:#6b7280;">${loteInfo}</p>` : ""}
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:6px;">
            <span style="
              background:${cfg.color}22; color:${cfg.color};
              padding:2px 7px; border-radius:9999px; font-size:11px; font-weight:600;">
              ${cfg.label}
            </span>
            <span style="font-size:11px; color:#6b7280;">
              ${new Date(alerta.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div style="margin-top:6px; text-align:right;">
            <a href="/panico" style="font-size:11px; font-weight:600; color:#2563eb; text-decoration:none;">
              Ver panel →
            </a>
          </div>
        </div>
        `,
        { maxWidth: 240 },
      );

      marker.on("click", () => onPinClick?.(alerta));
      marker.addTo(map!);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => map?.removeLayer(m));
    };
  }, [map, alertas, onPinClick]);

  return null;
}
