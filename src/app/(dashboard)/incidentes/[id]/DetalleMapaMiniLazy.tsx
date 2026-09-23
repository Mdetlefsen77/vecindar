"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { preconnect, preload } from "react-dom";
import { OSM_TILE_ORIGIN, mosaicoCentralUrl } from "@/lib/barrio/constantes";

const DetalleMapaMini = dynamic(() => import("./DetalleMapaMini"), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />,
});

export default function DetalleMapaMiniLazy(
  props: ComponentProps<typeof DetalleMapaMini>,
) {
  // Abre la conexión a los mosaicos y precarga el central (zoom 17, igual
  // que DetalleMapaMini) mientras todavía baja Leaflet.
  preconnect(OSM_TILE_ORIGIN);
  preload(mosaicoCentralUrl([props.latitud, props.longitud], 17), {
    as: "image",
    fetchPriority: "high",
  });
  return <DetalleMapaMini {...props} />;
}
