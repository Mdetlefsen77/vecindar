"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ManzanasLayer from "./ManzanasLayer";
import LotesLayer, { type EstadoLote } from "./LotesLayer";
import IncidentesLayer, { type IncidentePin } from "./IncidentesLayer";
import AlertasLayer, { type AlertaPin } from "./AlertasLayer";
import {
  BARRIO_CENTER,
  BARRIO_ZOOM,
  BARRIO_ZOOM_MIN,
  BARRIO_ZOOM_MAX,
  MANZANAS_CONFIG,
  type ManzanaConfig,
} from "@/lib/barrio/manzanas";

// Fix para los iconos de Leaflet en Next.js
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

interface MapViewProps {
  showManzanas?: boolean;
  showIncidentes?: boolean;
  showAlertas?: boolean;
  incidentes?: IncidentePin[];
  alertas?: AlertaPin[];
}

export default function MapView({
  showManzanas = true,
  showIncidentes = true,
  showAlertas = true,
  incidentes = [],
  alertas = [],
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [manzanaSeleccionada, setManzanaSeleccionada] =
    useState<ManzanaConfig | null>(null);
  const [lotesEstado, setLotesEstado] = useState<Record<string, EstadoLote>>(
    {},
  );

  // Fetchar estado de lotes cuando cambia la manzana seleccionada.
  // Cuando no hay manzana seleccionada no tocamos el estado acá (evita el
  // setState síncrono dentro del effect); el render usa `{}` en ese caso.
  useEffect(() => {
    if (!manzanaSeleccionada) return;

    void fetch(`/api/lotes?manzanaId=${manzanaSeleccionada.id}`)
      .then((r) => r.json())
      .then(
        (data: {
          lotes: {
            numero: string;
            usuarios: { id: number }[];
            incidentes: { id: number }[];
          }[];
        }) => {
          const estado: Record<string, EstadoLote> = {};
          for (const lote of data.lotes) {
            if (lote.incidentes.length > 0) {
              estado[lote.numero] = "incidente";
            } else if (lote.usuarios.length > 0) {
              estado[lote.numero] = "habitado";
            }
            // desocupado es el default en LotesLayer, no hace falta setearlo
          }
          setLotesEstado(estado);
        },
      )
      .catch(() => setLotesEstado({}));
  }, [manzanaSeleccionada]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const newMap = L.map(mapContainerRef.current, {
      minZoom: BARRIO_ZOOM_MIN,
      maxZoom: BARRIO_ZOOM_MAX,
    }).setView(BARRIO_CENTER, BARRIO_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: BARRIO_ZOOM_MAX,
    }).addTo(newMap);

    // Click en el fondo del mapa deselecciona la manzana
    newMap.on("click", () => setManzanaSeleccionada(null));

    setMap(newMap);
    mapRef.current = newMap;

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  const handleManzanaClick = useCallback((manzana: ManzanaConfig) => {
    // Toggle: si ya estaba seleccionada, deselecciona
    setManzanaSeleccionada((prev) =>
      prev?.id === manzana.id ? null : manzana,
    );
  }, []);

  return (
    <>
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: "500px" }}
      />
      {showManzanas && (
        <ManzanasLayer
          map={map}
          manzanas={MANZANAS_CONFIG}
          onManzanaClick={handleManzanaClick}
        />
      )}
      <LotesLayer
        map={map}
        manzana={manzanaSeleccionada}
        lotesEstado={manzanaSeleccionada ? lotesEstado : {}}
      />
      {showIncidentes && <IncidentesLayer map={map} incidentes={incidentes} />}
      {showAlertas && <AlertasLayer map={map} alertas={alertas} />}
    </>
  );
}
