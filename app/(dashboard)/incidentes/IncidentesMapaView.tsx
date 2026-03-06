"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BARRIO_CENTER, BARRIO_ZOOM } from "@/lib/barrio/manzanas";
import IncidentesLayer, {
  type IncidentePin,
} from "@/components/map/IncidentesLayer";
import { useState } from "react";

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

export default function IncidentesMapaView({
  incidentes,
}: {
  incidentes: IncidentePin[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = L.map(containerRef.current, { zoomControl: true }).setView(
      BARRIO_CENTER,
      BARRIO_ZOOM,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(m);

    mapRef.current = m;
    setMap(m);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div ref={containerRef} style={{ height: "220px" }} />
      <IncidentesLayer map={map} incidentes={incidentes} />
    </div>
  );
}
