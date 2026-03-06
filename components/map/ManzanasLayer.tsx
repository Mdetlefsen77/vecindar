"use client";

import { useEffect } from "react";
import L from "leaflet";
import { type ManzanaConfig } from "@/lib/barrio/manzanas";

interface ManzanasLayerProps {
  map: L.Map | null;
  manzanas: ManzanaConfig[];
  onManzanaClick?: (manzana: ManzanaConfig) => void;
}

/** Crea el DivIcon circular centrado en la manzana */
function createManzanaIcon(manzana: ManzanaConfig): L.DivIcon {
  const esManzana = manzana.tipo === "manzana";

  // Colores del círculo según tipo/zona
  const bg = esManzana
    ? "#ffffff"
    : manzana.tipo === "espacio_verde"
      ? "#dcfce7"
      : "#ede9fe";
  const border = esManzana
    ? manzana.zona === "Norte"
      ? "#2563eb"
      : "#ea580c"
    : manzana.tipo === "espacio_verde"
      ? "#16a34a"
      : "#7c3aed";
  const textColor = esManzana
    ? manzana.zona === "Norte"
      ? "#1d4ed8"
      : "#c2410c"
    : manzana.tipo === "espacio_verde"
      ? "#15803d"
      : "#6d28d9";

  // Manzanas regulares: círculo con "MZ" + número en dos líneas
  // EV/EUC: círculo más pequeño con el label abreviado
  const size = esManzana ? 44 : 38;
  const html = esManzana
    ? `<div style="
        width:${size}px; height:${size}px; border-radius:50%;
        background:${bg}; border:2.5px solid ${border};
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        box-shadow:0 1px 4px rgba(0,0,0,0.18); line-height:1.1; user-select:none;">
        <span style="font-size:9px; font-weight:700; color:${textColor}; letter-spacing:0.5px;">MZ</span>
        <span style="font-size:13px; font-weight:800; color:${textColor};">${manzana.numero}</span>
      </div>`
    : `<div style="
        width:${size}px; height:${size}px; border-radius:50%;
        background:${bg}; border:2px solid ${border};
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 1px 3px rgba(0,0,0,0.15); user-select:none;">
        <span style="font-size:9px; font-weight:700; color:${textColor}; text-align:center; line-height:1.2; padding:0 4px;">
          ${manzana.label ?? manzana.numero}
        </span>
      </div>`;

  return L.divIcon({
    html,
    className: "", // evita estilos default de Leaflet
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ManzanasLayer({
  map,
  manzanas,
  onManzanaClick,
}: ManzanasLayerProps) {
  useEffect(() => {
    const mapWithContainer = map as
      | (L.Map & { _container?: HTMLElement })
      | null;
    if (!mapWithContainer?._container || !manzanas.length) return;

    const layers: L.Marker[] = [];

    try {
      manzanas.forEach((manzana) => {
        const titulo =
          manzana.tipo === "manzana"
            ? `Manzana ${manzana.numero}`
            : (manzana.label ?? manzana.numero);

        const badge =
          manzana.tipo === "manzana"
            ? `<span style="
                background:${manzana.zona === "Norte" ? "#dbeafe" : "#ffedd5"};
                color:${manzana.zona === "Norte" ? "#1d4ed8" : "#c2410c"};
                padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:600;">
                Zona ${manzana.zona}
              </span>`
            : `<span style="
                background:#dcfce7; color:#15803d;
                padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:600;">
                ${manzana.tipo === "espacio_verde" ? "Espacio Verde" : "Uso Comunitario"}
              </span>`;

        const lotesInfo = manzana.cantidadLotes
          ? (() => {
              const inicio = manzana.loteInicio ?? 1;
              const fin = inicio + manzana.cantidadLotes - 1;
              return `<p style="margin:4px 0 0; font-size:12px; color:#6b7280;">${manzana.cantidadLotes} lotes (${inicio}–${fin})</p>`;
            })()
          : "";

        const center = L.polygon(manzana.bounds).getBounds().getCenter();
        const marker = L.marker(center, {
          icon: createManzanaIcon(manzana),
          zIndexOffset: 100,
        });

        marker.bindPopup(`
          <div style="min-width:140px; padding:4px 2px;">
            <h3 style="margin:0 0 6px; font-size:15px; font-weight:700; color:#111827;">${titulo}</h3>
            ${badge}
            ${lotesInfo}
          </div>
        `);

        marker.on("click", () => onManzanaClick?.(manzana));
        marker.addTo(map!);
        layers.push(marker);
      });
    } catch (error) {
      console.error("Error al agregar polígonos:", error);
    }

    return () => {
      try {
        layers.forEach((l) => map && map.removeLayer(l));
      } catch (error) {
        console.error("Error al limpiar marcadores:", error);
      }
    };
  }, [map, manzanas, onManzanaClick]);

  return null;
}
