"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MANZANAS_CONFIG } from "@/lib/barrio/manzanas";
import { escapeHtml } from "./html";

export interface OficioPin {
  id: number;
  titulo: string;
  categoria: string;
  emoji: string;
  /** Manzana del dueño. Va por manzana y no por lote, igual que en /oficios:
   * no se muestra en qué casa vive cada uno. */
  manzana: string;
  recomendaciones: number;
}

// Burbuja índigo (color de la sección Oficios) pegada arriba a la derecha del
// círculo "MZ", para no taparlo.
function crearIcono(cantidad: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="
        display:inline-flex; align-items:center; gap:3px;
        background:#4338ca; color:#fff; border:2px solid #fff;
        border-radius:9999px; padding:2px 8px 2px 6px;
        font-size:14px; font-weight:800; line-height:1.2; white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);">
        <span style="font-size:14px;">🧰</span>${cantidad}
      </div>`,
    className: "",
    iconSize: [52, 26],
    iconAnchor: [-8, 34],
    popupAnchor: [26, -34],
  });
}

export default function OficiosLayer({
  map,
  oficios,
  abrir = null,
}: {
  map: L.Map | null;
  oficios: OficioPin[];
  /** Manzana cuya lista se abre sola cuando el mapa termina de llegar ahí. */
  abrir?: string | null;
}) {
  useEffect(() => {
    const mapWithContainer = map as
      | (L.Map & { _container?: HTMLElement })
      | null;
    if (!mapWithContainer?._container || !oficios.length) return;

    const porManzana = new Map<string, OficioPin[]>();
    for (const o of oficios) {
      porManzana.set(o.manzana, [...(porManzana.get(o.manzana) ?? []), o]);
    }

    const markers: L.Marker[] = [];
    porManzana.forEach((lista, numero) => {
      const manzana = MANZANAS_CONFIG.find(
        (m) => m.tipo === "manzana" && m.numero === numero,
      );
      if (!manzana) return;

      const centro = L.polygon(manzana.bounds).getBounds().getCenter();
      const items = lista
        .map(
          (o) => `
            <li style="padding:8px 0; border-top:1px solid #e5e7eb;">
              <a href="/oficios/${o.id}" style="display:block; text-decoration:none;">
                <span style="display:block; font-size:15px; font-weight:700; color:#111827;">
                  ${o.emoji} ${escapeHtml(o.titulo)}
                </span>
                <span style="display:block; font-size:14px; color:#4b5563;">
                  ${escapeHtml(o.categoria)}${o.recomendaciones > 0 ? ` · 👍 ${o.recomendaciones}` : ""}
                </span>
              </a>
            </li>`,
        )
        .join("");

      const marker = L.marker(centro, {
        icon: crearIcono(lista.length),
        zIndexOffset: 300,
        title: `Servicios en la manzana ${numero}`,
      });
      marker.bindPopup(
        `
        <div style="min-width:210px;">
          <h3 style="margin:0 0 4px; font-size:17px; font-weight:700; color:#3730a3;">
            🧰 Servicios en la Manzana ${escapeHtml(numero)}
          </h3>
          <ul style="list-style:none; margin:0; padding:0; max-height:260px; overflow-y:auto;">
            ${items}
          </ul>
        </div>`,
        // Que el globito no quede debajo de los botones de zoom.
        { maxWidth: 280, autoPanPaddingTopLeft: L.point(60, 10) },
      );
      marker.addTo(map!);
      markers.push(marker);
      if (numero === abrir) map!.once("moveend", () => marker.openPopup());
    });

    return () => {
      markers.forEach((m) => map?.removeLayer(m));
    };
  }, [map, oficios, abrir]);

  return null;
}
