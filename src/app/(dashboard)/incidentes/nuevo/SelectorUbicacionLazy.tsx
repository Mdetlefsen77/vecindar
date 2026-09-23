"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { preconnect, preload } from "react-dom";
import { OSM_TILE_ORIGIN, mosaicoCentralUrl } from "@/lib/barrio/constantes";

// Leaflet no puede evaluarse en el servidor (usa `window` al importarse):
// sin esto, abrir /incidentes/nuevo directo (recarga, link, notificación)
// daba 500. El placeholder tiene la misma altura para no mover la página.
const SelectorUbicacionMapa = dynamic(() => import("./SelectorUbicacionMapa"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border-2 border-gray-200 bg-gray-100 animate-pulse"
      style={{ height: "240px" }}
    />
  ),
});

export default function SelectorUbicacionLazy(
  props: ComponentProps<typeof SelectorUbicacionMapa>,
) {
  // Abre la conexión a los mosaicos y precarga el central (LCP) mientras
  // todavía baja Leaflet.
  preconnect(OSM_TILE_ORIGIN);
  preload(mosaicoCentralUrl(), { as: "image", fetchPriority: "high" });
  return <SelectorUbicacionMapa {...props} />;
}
