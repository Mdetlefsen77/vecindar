"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUpload from "@/components/forms/ImageUpload";
import {
  DURACION_AVISO,
  ORDEN_TIPOS_AVISO,
  TIPO_AVISO,
  type DuracionAviso,
} from "@/lib/avisos";
import type { TipoAviso } from "@/generated/enums";

export default function NuevoAvisoPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoAviso | null>(null);
  const [ubicacion, setUbicacion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [imagen, setImagen] = useState<string | null>(null);
  const [duracion, setDuracion] = useState<DuracionAviso>("H24");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function elegirTipo(t: TipoAviso) {
    setTipo(t);
    setDuracion(TIPO_AVISO[t].duracion);
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return setError("Elegí qué tipo de aviso es.");
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, ubicacion, detalle, imagen, duracion }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "No se pudo publicar el aviso.");
      // Directo a su aviso, con el botón de compartir a la vista.
      router.push(d.id ? `/avisos#aviso-${d.id}` : "/avisos");
      router.refresh();
    } catch {
      setError("Ocurrió un error de red.");
    } finally {
      setCargando(false);
    }
  }

  const campo =
    "mt-1.5 block w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-900 bg-white";

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/avisos" className="text-gray-500 hover:text-gray-600 text-sm">
          ← Avisos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Dar un aviso</h1>
        <p className="text-sm text-gray-500">
          Para avisarle al barrio algo que está pasando. Se borra solo al vencer.
        </p>
      </div>

      <form
        onSubmit={publicar}
        className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5"
      >
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700">¿Qué pasa?</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {ORDEN_TIPOS_AVISO.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => elegirTipo(t)}
                aria-pressed={tipo === t}
                className={`min-h-[48px] px-3 py-2 rounded-xl border-2 text-sm font-semibold text-left transition-colors ${
                  tipo === t
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-gray-200 text-gray-700 hover:border-blue-300"
                }`}
              >
                <span aria-hidden="true">{TIPO_AVISO[t].emoji}</span>{" "}
                {TIPO_AVISO[t].label}
              </button>
            ))}
          </div>
          {tipo && TIPO_AVISO[tipo].riesgo && (
            <p className="mt-2 text-xs text-amber-800">
              🔔 Este tipo de aviso les llega como notificación a todos los vecinos.
            </p>
          )}
        </fieldset>

        <label className="block text-sm font-semibold text-gray-700">
          ¿Dónde?
          <input
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            maxLength={100}
            placeholder="Ej: calle K esquina calle 3"
            className={campo}
          />
        </label>

        <label className="block text-sm font-semibold text-gray-700">
          Detalle <span className="font-normal text-gray-500">(opcional)</span>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={tipo ? TIPO_AVISO[tipo].ejemplo : "Contá qué pasa."}
            className={`${campo} resize-none`}
          />
        </label>

        <ImageUpload label="Foto (opcional)" value={imagen} onChange={setImagen} />

        <fieldset>
          <legend className="text-sm font-semibold text-gray-700">
            ¿Cuánto tiempo se muestra?
          </legend>
          <div className="mt-1.5 flex gap-2">
            {(Object.keys(DURACION_AVISO) as DuracionAviso[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuracion(d)}
                aria-pressed={duracion === d}
                className={`flex-1 min-h-[44px] rounded-xl border-2 text-sm font-semibold ${
                  duracion === d
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {DURACION_AVISO[d].label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Si se resuelve antes, vos o los vecinos lo pueden marcar como resuelto.
          </p>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl"
        >
          {cargando ? "Publicando…" : "Publicar aviso"}
        </button>
      </form>
    </div>
  );
}
