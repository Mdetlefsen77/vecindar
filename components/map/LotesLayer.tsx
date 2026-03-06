"use client";

import { useEffect } from "react";
import L from "leaflet";
import { type ManzanaConfig, COLORES_LOTE } from "@/lib/barrio/manzanas";
import { calcularLotesPolygons, type LotePolygon } from "@/lib/barrio/lotes";

export type EstadoLote = keyof typeof COLORES_LOTE;

interface LotesLayerProps {
  map: L.Map | null;
  /** Manzana seleccionada. null = no se muestran lotes. */
  manzana: ManzanaConfig | null;
  /**
   * Estado de cada lote, keyed por numero de lote (ej. "1", "12").
   * Los lotes sin entrada se muestran como "desocupado".
   */
  lotesEstado?: Record<string, EstadoLote>;
  onLoteClick?: (lote: LotePolygon, manzana: ManzanaConfig) => void;
}

export default function LotesLayer({
  map,
  manzana,
  lotesEstado = {},
  onLoteClick,
}: LotesLayerProps) {
  useEffect(() => {
    const mapWithContainer = map as
      | (L.Map & { _container?: HTMLElement })
      | null;
    if (!mapWithContainer?._container || !manzana) return;

    const lotes = calcularLotesPolygons(manzana);
    if (!lotes.length) return;

    const layers: L.Polygon[] = [];

    lotes.forEach((lote) => {
      const estado: EstadoLote = lotesEstado[lote.numero] ?? "desocupado";
      const estilo = COLORES_LOTE[estado];

      const polygon = L.polygon(lote.bounds, {
        color: estilo.color,
        fillColor: estilo.fillColor,
        fillOpacity: estilo.fillOpacity,
        weight: estilo.weight,
        // Para que los bordes internos sean más finos que el perímetro de manzana
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
                    font-size:9px; font-weight:600; font-family:monospace;
                    color:#374151; line-height:1;
                    background:rgba(255,255,255,0.78);
                    border-radius:2px; padding:1px 2px;
                    user-select:none; pointer-events:none;">
                    ${lote.numero}
                </span>`,
        className: "",
        iconSize: [28, 14],
        iconAnchor: [14, 7],
      });

      const labelMarker = L.marker(lote.centro, {
        icon: label,
        interactive: false,
      });

      const zonaLabel = manzana.zona === "Norte" ? "Norte" : "Sur";
      polygon.bindPopup(`
                <div style="min-width:130px; padding:3px 2px;">
                    <h3 style="margin:0 0 4px; font-size:14px; font-weight:700; color:#111827;">
                        Lote ${lote.numero}
                    </h3>
                    <p style="margin:0 0 3px; font-size:12px; color:#6b7280;">
                        Manzana ${manzana.numero} · Zona ${zonaLabel}
                    </p>
                    <span style="
                        background:${estado === "habitado" ? "#dcfce7" : estado === "incidente" ? "#fee2e2" : estado === "sos_activo" ? "#fef3c7" : "#f1f5f9"};
                        color:${estado === "habitado" ? "#15803d" : estado === "incidente" ? "#dc2626" : estado === "sos_activo" ? "#d97706" : "#64748b"};
                        padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:600;">
                        ${estado === "habitado" ? "Habitado" : estado === "incidente" ? "Incidente" : estado === "sos_activo" ? "Alerta SOS" : "Desocupado"}
                    </span>
                </div>
            `);

      polygon.on("click", () => onLoteClick?.(lote, manzana));

      polygon.addTo(map!);
      labelMarker.addTo(map!);
      layers.push(polygon);

      // Guardamos el marker para limpieza usando la referencia del array
      (polygon as L.Polygon & { _labelMarker?: L.Marker })._labelMarker =
        labelMarker;
    });

    return () => {
      layers.forEach((p) => {
        const withLabel = p as L.Polygon & { _labelMarker?: L.Marker };
        withLabel._labelMarker?.remove();
        map?.removeLayer(p);
      });
    };
  }, [map, manzana, lotesEstado, onLoteClick]);

  return null;
}
