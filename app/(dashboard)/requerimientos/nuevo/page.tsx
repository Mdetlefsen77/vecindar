"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIAS = [
  { value: "ILUMINACION", label: "Iluminación" },
  { value: "PODA", label: "Poda" },
  { value: "CALLES", label: "Calles" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura" },
  { value: "OTRO", label: "Otro" },
];

export default function NuevoRequerimientoPage() {
  const router = useRouter();
  const [categoria, setCategoria] = useState("ILUMINACION");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!titulo.trim() || !descripcion.trim()) {
      setError("Completá todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/requerimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, titulo, descripcion }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al crear el requerimiento.");
      }

      router.push("/requerimientos");
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
          href="/requerimientos"
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
            Nuevo requerimiento
          </h1>
          <p className="text-sm text-gray-500">Pedido, reclamo o sugerencia</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
      >
        {/* Categoría */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Categoría
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoria(c.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                  categoria === c.value
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <div>
          <label
            htmlFor="titulo"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Luminaria apagada en calle Ñ"
            maxLength={100}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
            placeholder="Describí el problema con el mayor detalle posible..."
            rows={5}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Enviando..." : "Enviar requerimiento"}
        </button>
      </form>
    </div>
  );
}
