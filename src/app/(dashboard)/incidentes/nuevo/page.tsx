"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BARRIO_CENTER, BARRIO_ZOOM } from "@/lib/barrio/manzanas";

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

const TIPOS = [
  { value: "ROBO", label: "🔴 Robo" },
  { value: "ROBO_TENTATIVA", label: "🟠 Intento de robo" },
  { value: "SOSPECHOSO", label: "🟡 Sospechoso" },
  { value: "VANDALISMO", label: "🟣 Vandalismo" },
  { value: "OTRO", label: "⚫ Otro" },
];

export default function NuevoIncidentePage() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.Marker | null>(null);

  const [tipo, setTipo] = useState("ROBO");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacionText, setUbicacionText] = useState("");
  const [coordenadas, setCoordenadas] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      BARRIO_CENTER,
      BARRIO_ZOOM,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // Click en el mapa coloca / mueve el pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setCoordenadas({ lat, lng });

      if (pinRef.current) {
        pinRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setCoordenadas({ lat: pos.lat, lng: pos.lng });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    if (!coordenadas) {
      setError("Tocá el mapa para indicar la ubicación del incidente.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/incidentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          descripcion,
          ubicacionText: ubicacionText || null,
          latitud: coordenadas.lat,
          longitud: coordenadas.lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al reportar el incidente.");
      }

      router.push("/incidentes");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/incidentes"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reportar incidente
          </h1>
          <p className="text-sm text-gray-500">Marcá la ubicación en el mapa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mapa para marcar ubicación */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Ubicación <span className="text-red-500">*</span>
            <span className="font-normal text-gray-400 ml-1">
              — tocá el mapa para marcar
            </span>
          </label>
          <div
            ref={mapContainerRef}
            className="rounded-xl overflow-hidden border-2 transition-colors"
            style={{
              height: "240px",
              borderColor: coordenadas ? "#16a34a" : "#e5e7eb",
            }}
          />
          {coordenadas ? (
            <p className="text-xs text-green-600 mt-1 font-medium">
              ✓ Ubicación marcada — podés arrastrar el pin para ajustar
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Aún no marcaste la ubicación
            </p>
          )}
        </div>

        {/* Tipo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tipo de incidente
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                    tipo === t.value
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-red-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Referencia textual */}
          <div>
            <label
              htmlFor="ubicacionText"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Referencia de ubicación{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              id="ubicacionText"
              type="text"
              value={ubicacionText}
              onChange={(e) => setUbicacionText(e.target.value)}
              placeholder="Ej: Esquina calle Ñ y calle K"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="descripcion"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describí lo que observaste con el mayor detalle posible..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Enviando..." : "Reportar incidente"}
        </button>
      </form>
    </div>
  );
}
