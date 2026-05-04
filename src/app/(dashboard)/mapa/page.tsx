"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { IncidentePin } from "@/components/map/IncidentesLayer";
import type { AlertaPin } from "@/components/map/AlertasLayer";

// Importar el mapa con SSR deshabilitado (Leaflet solo funciona en el cliente)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  ),
});

type LayerKey = "manzanas" | "incidentes" | "alertas";

const LAYER_LABELS: Record<LayerKey, string> = {
  manzanas: "Manzanas",
  incidentes: "Incidentes",
  alertas: "Alertas SOS",
};

export default function MapaPage() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    manzanas: true,
    incidentes: true,
    alertas: true,
  });

  const [incidentes, setIncidentes] = useState<IncidentePin[]>([]);
  const [alertas, setAlertas] = useState<AlertaPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [incRes, alertRes] = await Promise.all([
          fetch("/api/incidentes"),
          fetch("/api/panico"),
        ]);

        if (incRes.ok) {
          const data = await incRes.json();
          setIncidentes(
            (data as IncidentePin[]).filter(
              (i) => i.latitud != null && i.longitud != null,
            ),
          );
        }
        if (alertRes.ok) {
          const data = await alertRes.json();
          setAlertas(
            (data as AlertaPin[]).filter(
              (a) => a.latitud != null && a.longitud != null,
            ),
          );
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, []);

  function toggleLayer(key: LayerKey) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function showAll() {
    setLayers({ manzanas: true, incidentes: true, alertas: true });
  }

  const allActive = Object.values(layers).every(Boolean);

  const activasCount = alertas.filter((a) => a.estado !== "CERRADO").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <h1 className="text-3xl font-bold text-gray-900">Mapa del Barrio</h1>
          <p className="mt-2 text-sm text-gray-600">
            Visualización de manzanas, lotes e incidentes reportados
          </p>
        </div>

        {/* Controles */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={showAll}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                allActive
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Ver Todo
            </button>

            {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => {
              const active = layers[key];
              const isAlerta = key === "alertas";
              const badge =
                isAlerta && activasCount > 0 ? (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {activasCount}
                  </span>
                ) : null;

              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    active
                      ? isAlerta
                        ? "bg-red-100 border border-red-400 text-red-700"
                        : "bg-blue-100 border border-blue-400 text-blue-700"
                      : "bg-white border border-gray-300 text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {LAYER_LABELS[key]}
                  {badge}
                </button>
              );
            })}

            {loading && (
              <span className="text-xs text-gray-400 ml-2 animate-pulse">
                Cargando datos…
              </span>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="h-[600px] relative">
          <MapView
            showManzanas={layers.manzanas}
            showIncidentes={layers.incidentes}
            showAlertas={layers.alertas}
            incidentes={incidentes}
            alertas={alertas}
          />
        </div>

        {/* Leyenda */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Leyenda</h3>
          <div className="flex gap-4 flex-wrap text-sm">
            {layers.manzanas && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full" />
                  <span className="text-gray-600">Manzanas Sur</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full" />
                  <span className="text-gray-600">Manzanas Norte</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full" />
                  <span className="text-gray-600">Espacios Verdes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-violet-500 rounded-full" />
                  <span className="text-gray-600">Usos Comunitarios</span>
                </div>
              </>
            )}
            {layers.incidentes && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <span className="text-gray-600">
                  Incidentes ({incidentes.length})
                </span>
              </div>
            )}
            {layers.alertas && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                <span className="text-gray-600">
                  Alertas SOS ({alertas.length})
                  {activasCount > 0 && (
                    <span className="ml-1 text-red-600 font-semibold">
                      · {activasCount} activa{activasCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
