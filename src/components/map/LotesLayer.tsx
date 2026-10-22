"use client";

import { useEffect } from "react";
import L from "leaflet";
import { type ManzanaConfig, COLORES_LOTE } from "@/lib/barrio/manzanas";
import { calcularLotesPolygons, type LotePolygon } from "@/lib/barrio/lotes";
import { escapeHtml } from "./html";

export type EstadoLote = keyof typeof COLORES_LOTE;

// Tu casa y el lote buscado van en el azul de la sección Mapa.
const ESTILO_DESTACADO = {
  color: "#1d4ed8",
  fillColor: "#bfdbfe",
  fillOpacity: 0.85,
  weight: 3,
};

const ETIQUETA_ESTADO: Record<
  EstadoLote,
  { texto: string; fondo: string; color: string }
> = {
  habitado: { texto: "Habitado", fondo: "#dcfce7", color: "#15803d" },
  incidente: { texto: "Incidente", fondo: "#ffedd5", color: "#c2410c" },
  sos_activo: { texto: "Alerta SOS", fondo: "#fee2e2", color: "#b91c1c" },
  desocupado: { texto: "Desocupado", fondo: "#f1f5f9", color: "#475569" },
};

interface LotesLayerProps {
  map: L.Map | null;
  /** Manzana seleccionada. null = no se muestran lotes. */
  manzana: ManzanaConfig | null;
  /**
   * Muestra si cada lote está habitado o desocupado y quién vive ahí. Solo
   * para la guardia y el admin (VEN_DETALLE_LOTES): al vecino no se le
   * muestran casas vacías ni nombres.
   */
  mostrarEstado?: boolean;
  /**
   * Estado de cada lote, keyed por numero de lote (ej. "1", "12").
   * Los lotes sin entrada se muestran como "desocupado".
   */
  lotesEstado?: Record<string, EstadoLote>;
  /** Nombre y apellido de las cuentas de cada lote, keyed por numero de lote. */
  lotesResidentes?: Record<string, string[]>;
  /** Número del lote del usuario: se pinta en azul como "Tu casa". */
  miLote?: string | null;
  /** Número del lote que se buscó: se resalta igual que tu casa. */
  destacado?: string | null;
  onLoteClick?: (lote: LotePolygon, manzana: ManzanaConfig) => void;
}

export default function LotesLayer({
  map,
  manzana,
  mostrarEstado = false,
  lotesEstado = {},
  lotesResidentes = {},
  miLote = null,
  destacado = null,
  onLoteClick,
}: LotesLayerProps) {
  useEffect(() => {
    const mapWithContainer = map as
      | (L.Map & { _container?: HTMLElement })
      | null;
    if (!mapWithContainer?._container || !manzana) return;

    const lotes = calcularLotesPolygons(manzana);
    if (!lotes.length) return;

    const layers: L.Layer[] = [];

    lotes.forEach((lote) => {
      const estado: EstadoLote = mostrarEstado
        ? (lotesEstado[lote.numero] ?? "desocupado")
        : "desocupado";
      const esMiCasa = lote.numero === miLote;
      const resaltado = esMiCasa || lote.numero === destacado;
      const estilo = resaltado ? ESTILO_DESTACADO : COLORES_LOTE[estado];

      const polygon = L.polygon(lote.bounds, {
        color: estilo.color,
        fillColor: estilo.fillColor,
        fillOpacity: estilo.fillOpacity,
        weight: estilo.weight,
        opacity: 0.9,
      });

      polygon.on("mouseover", () => {
        polygon.setStyle({
          fillOpacity: Math.min(estilo.fillOpacity + 0.15, 1),
          weight: estilo.weight + 0.6,
        });
      });
      polygon.on("mouseout", () => {
        polygon.setStyle({
          fillOpacity: estilo.fillOpacity,
          weight: estilo.weight,
        });
      });

      // Etiqueta de número dentro del lote
      const label = L.divIcon({
        html: `<span style="
                    display:inline-block;
                    font-size:${resaltado ? 13 : 11}px; font-weight:700;
                    color:${resaltado ? "#1e3a8a" : "#374151"}; line-height:1;
                    background:rgba(255,255,255,0.85);
                    border-radius:3px; padding:1px 3px;
                    user-select:none; pointer-events:none;">
                    ${esMiCasa ? "🏠 " : ""}${lote.numero}
                </span>`,
        className: "",
        iconSize: [44, 16],
        iconAnchor: [22, 8],
      });
      const labelMarker = L.marker(lote.centro, {
        icon: label,
        interactive: false,
      });

      const zonaLabel = manzana.zona === "Norte" ? "Norte" : "Sur";
      const etiqueta = ETIQUETA_ESTADO[estado];
      const estadoHtml = mostrarEstado
        ? `<span style="
                        background:${etiqueta.fondo}; color:${etiqueta.color};
                        padding:2px 10px; border-radius:9999px; font-size:13px; font-weight:600;">
                        ${etiqueta.texto}
                    </span>`
        : "";
      const residentes = mostrarEstado
        ? (lotesResidentes[lote.numero] ?? [])
        : [];
      const residentesHtml = residentes.length
        ? `<div style="margin-top:8px; font-size:14px; color:#374151; line-height:1.4;">
                        ${residentes
                          .map((nombre) => `<div>${escapeHtml(nombre)}</div>`)
                          .join("")}
                    </div>`
        : "";

      polygon.bindPopup(`
                <div style="min-width:150px; padding:3px 2px;">
                    <h3 style="margin:0 0 4px; font-size:17px; font-weight:700; color:#111827;">
                        ${esMiCasa ? "🏠 Tu casa · " : ""}Lote ${lote.numero}
                    </h3>
                    <p style="margin:0 0 6px; font-size:14px; color:#4b5563;">
                        Manzana ${manzana.numero} · Zona ${zonaLabel}
                    </p>
                    ${estadoHtml}
                    ${residentesHtml}
                </div>
            `);

      polygon.on("click", () => onLoteClick?.(lote, manzana));
      polygon.addTo(map!);
      labelMarker.addTo(map!);
      layers.push(polygon, labelMarker);
    });

    return () => {
      layers.forEach((l) => map?.removeLayer(l));
    };
  }, [
    map,
    manzana,
    mostrarEstado,
    lotesEstado,
    lotesResidentes,
    miLote,
    destacado,
    onLoteClick,
  ]);

  return null;
}
