"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  BARRIO_CENTER,
  BARRIO_ZOOM,
  OSM_TILE_URL,
} from "@/lib/barrio/constantes";

// Fix iconos Leaflet
type IconDefaultWithGetUrl = L.Icon.Default & { _getIconUrl?: string };
delete (L.Icon.Default.prototype as IconDefaultWithGetUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/**
 * Mapa para marcar dónde pasó un incidente: tocar coloca el pin, arrastrarlo
 * lo ajusta. Leaflet usa `window` apenas se importa, así que este componente
 * se carga solo en el navegador (ver SelectorUbicacionLazy).
 */
export default function SelectorUbicacionMapa({
  marcado,
  onChange,
}: {
  marcado: boolean;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  // Ref para no reinicializar el mapa si el padre pasa un callback nuevo.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      BARRIO_CENTER,
      BARRIO_ZOOM,
    );
    L.tileLayer(OSM_TILE_URL, {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // Click en el mapa coloca / mueve el pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onChangeRef.current({ lat, lng });

      if (pinRef.current) {
        pinRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        });
        pinRef.current = marker;
      }
    });

    mapRef.current = map;
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className="rounded-xl overflow-hidden border-2 transition-colors"
      style={{
        height: "240px",
        borderColor: marcado ? "#16a34a" : "#e5e7eb",
      }}
    />
  );
}
