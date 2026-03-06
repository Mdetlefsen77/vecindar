"use client";

import dynamic from "next/dynamic";

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

export default function MapaPage() {
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
          <div className="flex gap-2 flex-wrap">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
              Ver Todo
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
              Manzanas
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
              Incidentes
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
              Alertas SOS
            </button>
          </div>
        </div>

        {/* Mapa */}
        <div className="h-[600px] relative">
          <MapView />
        </div>

        {/* Leyenda */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Leyenda</h3>
          <div className="flex gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-gray-600">Manzanas Sur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Manzanas Norte</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Espacios Verdes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-violet-500 rounded-full"></div>
              <span className="text-gray-600">Usos Comunitarios</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Incidentes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Alertas SOS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
