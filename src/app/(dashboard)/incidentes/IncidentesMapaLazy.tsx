"use client";

import dynamic from "next/dynamic";
import { preconnect, preload } from "react-dom";
import { OSM_TILE_ORIGIN, mosaicoCentralUrl } from "@/lib/barrio/constantes";
import type { IncidentePin } from "@/components/map/IncidentesLayer";

// El dynamic con ssr:false debe vivir en un Client Component
const IncidentesMapaView = dynamic(() => import("./IncidentesMapaView"), {
  ssr: false,
  loading: () => (
    <div className="h-56 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
});

export default function IncidentesMapaLazy({
  incidentes,
}: {
  incidentes: IncidentePin[];
}) {
  // Abre la conexión a los mosaicos y precarga el central (LCP) mientras
  // todavía baja Leaflet.
  preconnect(OSM_TILE_ORIGIN);
  preload(mosaicoCentralUrl(), { as: "image", fetchPriority: "high" });
  return <IncidentesMapaView incidentes={incidentes} />;
}
