"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OSM_TILE_URL } from "@/lib/barrio/constantes";
import ManzanasLayer from "./ManzanasLayer";
import LotesLayer, { type EstadoLote } from "./LotesLayer";
import IncidentesLayer, { type IncidentePin } from "./IncidentesLayer";
import AlertasLayer, { type AlertaPin } from "./AlertasLayer";
import OficiosLayer, { type OficioPin } from "./OficiosLayer";
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

/**
 * Punto al que vuela el mapa: tu casa, un lote buscado o un SOS. `n` cambia
 * en cada pedido, así tocar dos veces "Mi casa" vuelve a centrar.
 */
export interface Foco {
  centro: [number, number];
  /** Si es un lote, se abre su manzana y se resalta ese lote. */
  manzanaId?: number;
  lote?: string;
  n: number;
}

interface MapViewProps {
  showManzanas?: boolean;
  showIncidentes?: boolean;
  showAlertas?: boolean;
  showOficios?: boolean;
  incidentes?: IncidentePin[];
  alertas?: AlertaPin[];
  oficios?: OficioPin[];
  /** Manzana a la que vuela el mapa para abrir su lista de oficios. */
  oficiosDe?: string | null;
  /** Guardia y admin: estado de cada lote y quién vive ahí. */
  detalleLotes?: boolean;
  /** Número del lote del usuario, para pintarlo como "Tu casa". */
  miLote?: string | null;
  foco?: Foco | null;
}

export default function MapView({
  showManzanas = true,
  showIncidentes = true,
  showAlertas = true,
  showOficios = true,
  incidentes = [],
  alertas = [],
  oficios = [],
  oficiosDe = null,
  detalleLotes = false,
  miLote = null,
  foco = null,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [manzanaSeleccionada, setManzanaSeleccionada] =
    useState<ManzanaConfig | null>(null);
  const [lotesEstado, setLotesEstado] = useState<Record<string, EstadoLote>>(
    {},
  );
  // Nombre y apellido de las cuentas de cada lote, keyed por numero de lote.
  const [lotesResidentes, setLotesResidentes] = useState<
    Record<string, string[]>
  >({});

  // Fetchar estado de lotes cuando cambia la manzana seleccionada. Solo la
  // guardia y el admin lo reciben: al vecino la API no le manda nombres.
  // Cuando no hay manzana seleccionada no tocamos el estado acá (evita el
  // setState síncrono dentro del effect); el render usa `{}` en ese caso.
  useEffect(() => {
    if (!manzanaSeleccionada || !detalleLotes) return;

    void fetch(`/api/lotes?manzanaId=${manzanaSeleccionada.id}`)
      .then((r) => r.json())
      .then(
        (data: {
          lotes: {
            numero: string;
            usuarios: { id: number; nombre: string; apellido: string }[];
            incidentes: { id: number }[];
          }[];
        }) => {
          const estado: Record<string, EstadoLote> = {};
          const residentes: Record<string, string[]> = {};
          for (const lote of data.lotes) {
            if (lote.incidentes.length > 0) {
              estado[lote.numero] = "incidente";
            } else if (lote.usuarios.length > 0) {
              estado[lote.numero] = "habitado";
            }
            // desocupado es el default en LotesLayer, no hace falta setearlo
            if (lote.usuarios.length > 0) {
              residentes[lote.numero] = lote.usuarios.map((u) =>
                `${u.nombre} ${u.apellido}`.trim(),
              );
            }
          }
          setLotesEstado(estado);
          setLotesResidentes(residentes);
        },
      )
      .catch(() => {
        setLotesEstado({});
        setLotesResidentes({});
      });
  }, [manzanaSeleccionada, detalleLotes]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const newMap = L.map(mapContainerRef.current, {
      minZoom: BARRIO_ZOOM_MIN,
      maxZoom: BARRIO_ZOOM_MAX,
    }).setView(BARRIO_CENTER, BARRIO_ZOOM);
    // Encuadrar el barrio entero: con el zoom fijo, en el celular quedaba
    // chiquito y corrido hacia abajo.
    newMap.fitBounds(
      L.latLngBounds(MANZANAS_CONFIG.flatMap((m) => m.bounds)),
      { padding: [12, 12] },
    );

    L.tileLayer(OSM_TILE_URL, {
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

  // Volar al foco pedido y, si es un lote, abrir su manzana.
  useEffect(() => {
    if (!map || !foco) return;
    map.flyTo(foco.centro, 18, { duration: 0.8 });
    if (foco.manzanaId != null) {
      const manzana = MANZANAS_CONFIG.find((m) => m.id === foco.manzanaId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el mapa con un pedido externo
      if (manzana) setManzanaSeleccionada(manzana);
    }
  }, [map, foco]);

  // Venir desde un oficio: centrar su manzana (OficiosLayer abre la lista).
  useEffect(() => {
    if (!map || !oficiosDe) return;
    const manzana = MANZANAS_CONFIG.find(
      (m) => m.tipo === "manzana" && m.numero === oficiosDe,
    );
    if (manzana) {
      map.flyTo(L.polygon(manzana.bounds).getBounds().getCenter(), 17, {
        duration: 0.8,
      });
    }
  }, [map, oficiosDe]);

  const handleManzanaClick = useCallback((manzana: ManzanaConfig) => {
    // Toggle: si ya estaba seleccionada, deselecciona
    setManzanaSeleccionada((prev) =>
      prev?.id === manzana.id ? null : manzana,
    );
  }, []);

  const detalle = detalleLotes && manzanaSeleccionada;

  return (
    <>
      <div ref={mapContainerRef} className="w-full h-full" />
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
        mostrarEstado={detalleLotes}
        lotesEstado={detalle ? lotesEstado : {}}
        lotesResidentes={detalle ? lotesResidentes : {}}
        miLote={miLote}
        destacado={foco?.lote ?? null}
      />
      {showIncidentes && <IncidentesLayer map={map} incidentes={incidentes} />}
      {showOficios && (
        <OficiosLayer map={map} oficios={oficios} abrir={oficiosDe} />
      )}
      {showAlertas && <AlertasLayer map={map} alertas={alertas} />}
    </>
  );
}
