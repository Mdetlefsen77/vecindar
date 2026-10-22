"use client";

import { useEffect } from "react";
import L from "leaflet";
import { escapeHtml } from "./html";

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
      const lote = alerta.usuario?.lote;
      const loteInfo = lote
        ? `Manzana ${escapeHtml(lote.manzana.numero)} · Lote ${escapeHtml(lote.numero)}`
        : "";
      const telefono = alerta.usuario?.telefono?.trim();
      const activa = alerta.estado !== "CERRADO";

      const marker = L.marker([alerta.latitud, alerta.longitud], {
        icon: crearAlertaIcon(alerta.estado),
        zIndexOffset: 500,
      });

      marker.bindPopup(
        `
        <div style="min-width:200px; padding:3px 2px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-size:20px;">🆘</span>
            <span style="font-weight:700; font-size:17px; color:#b91c1c;">Alerta SOS</span>
          </div>
          <p style="margin:0 0 4px; font-size:16px; font-weight:700; color:#111827;">
            ${escapeHtml(alerta.usuario?.nombre ?? "Vecino")}
          </p>
          ${loteInfo ? `<p style="margin:0 0 6px; font-size:14px; color:#4b5563;">${loteInfo}</p>` : ""}
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px;">
            <span style="
              background:${cfg.color}22; color:${cfg.color};
              padding:2px 10px; border-radius:9999px; font-size:13px; font-weight:700;">
              ${cfg.label}
            </span>
            <span style="font-size:14px; color:#4b5563;">
              ${new Date(alerta.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            ${
              telefono && activa
                ? `<a href="tel:${escapeHtml(telefono.replace(/[^\d+]/g, ""))}"
                     style="flex:1; text-align:center; background:#dc2626; color:#fff; font-size:15px; font-weight:700; padding:10px 8px; border-radius:10px; text-decoration:none;">
                     📞 Llamar
                   </a>`
                : ""
            }
            <a href="/panico"
               style="flex:1; text-align:center; background:#f3f4f6; color:#1f2937; font-size:15px; font-weight:700; padding:10px 8px; border-radius:10px; text-decoration:none;">
              Ver panel
            </a>
          </div>
        </div>
        `,
        { maxWidth: 280 },
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
