"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaMascotaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"PERDIDA" | "ENCONTRADA">("PERDIDA");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [zona, setZona] = useState("");
  const [contacto, setContacto] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!descripcion.trim() || !zona.trim() || !contacto.trim()) {
      setError("Descripción, zona y contacto son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mascotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nombre: nombre.trim() || undefined,
          descripcion: descripcion.trim(),
          zona: zona.trim(),
          contacto: contacto.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al publicar.");

      router.push("/mascotas");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600 mb-2"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Publicar alerta de mascota
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Avisá al barrio si perdiste o encontraste una mascota.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de alerta
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["PERDIDA", "ENCONTRADA"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`p-4 rounded-xl border-2 text-center transition-colors ${
                  tipo === t
                    ? t === "PERDIDA"
                      ? "border-orange-400 bg-orange-50"
                      : "border-green-400 bg-green-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="text-3xl mb-1">
                  {t === "PERDIDA" ? "🐾" : "✅"}
                </div>
                <div className="font-semibold text-sm">
                  {t === "PERDIDA" ? "Mascota perdida" : "Mascota encontrada"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t === "PERDIDA"
                    ? "La perdí y la estoy buscando"
                    : "La encontré y busco al dueño"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la mascota{" "}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej: Firulais, Luna..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder={
              tipo === "PERDIDA"
                ? "Raza, color, tamaño, collar, señas particulares..."
                : "Describe la mascota que encontraste: raza, color, collar..."
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Zona */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zona / última vez vista <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="ej: Cerca de la entrada, Manzana 5, Sector Sur..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Contacto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contacto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder="Teléfono, WhatsApp o cómo contactarte..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Publicando..." : "Publicar alerta"}
        </button>
      </form>
    </div>
  );
}
