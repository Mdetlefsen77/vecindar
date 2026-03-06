"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TIPO_COLORES: Record<string, string> = {
  ROBO: "#dc2626",
  ROBO_TENTATIVA: "#ea580c",
  SOSPECHOSO: "#d97706",
  VANDALISMO: "#7c3aed",
  OTRO: "#6b7280",
};

interface Props {
  latitud: number;
  longitud: number;
  tipo: string;
  estado: string;
}

export default function DetalleMapaMini({
  latitud,
  longitud,
  tipo,
  estado,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
    }).setView([latitud, longitud], 17);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const resuelto = estado !== "ACTIVO";
    const color = resuelto ? "#9ca3af" : (TIPO_COLORES[tipo] ?? "#6b7280");

    const icon = L.divIcon({
      html: `<div style="
                width:28px; height:28px; border-radius:50% 50% 50% 0;
                transform:rotate(-45deg); background:${color};
                border:2px solid rgba(255,255,255,0.9);
                box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            </div>`,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    L.marker([latitud, longitud], { icon }).addTo(map);

    mapRef.current = map;
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [latitud, longitud, tipo, estado]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <div ref={containerRef} style={{ height: "180px" }} />
    </div>
  );
}
