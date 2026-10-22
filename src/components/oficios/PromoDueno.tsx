"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUpload from "@/components/forms/ImageUpload";
import { DURACION_PROMO } from "@/lib/oficios";

type Duracion = keyof typeof DURACION_PROMO;

function aNumero(v: string): number | null {
  const limpio = v.replace(/\D/g, "");
  return limpio ? Number(limpio) : null;
}

/** Botón "Borrar promo" (dueño o admin). */
export function BorrarPromo({ oficioId }: { oficioId: number }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function borrar() {
    if (!confirm("¿Borrar la promo? Deja de verse en el momento.")) return;
    setCargando(true);
    const res = await fetch(`/api/oficios/${oficioId}/promo`, { method: "DELETE" }).catch(
      () => null,
    );
    setCargando(false);
    if (!res?.ok) return alert("No se pudo borrar la promo.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={borrar}
      disabled={cargando}
      className="min-h-[40px] px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
    >
      Borrar promo
    </button>
  );
}

/**
 * Carga de la promo para el dueño. Si su aporte no lo habilita, muestra el
 * motivo y el link a "Mi suscripción" en lugar del formulario.
 */
export function CargarPromo({
  oficioId,
  habilitado,
}: {
  oficioId: number;
  habilitado: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioAntes, setPrecioAntes] = useState("");
  const [precioAhora, setPrecioAhora] = useState("");
  const [imagen, setImagen] = useState<string | null>(null);
  const [duracion, setDuracion] = useState<Duracion>("DIA");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!habilitado) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-1">
        <p>
          🔥 <strong>Promos:</strong> con tu aporte al día podés destacar una
          promo de tu oficio por 24 horas o una semana.
        </p>
        <Link href="/mi-suscripcion" className="font-semibold text-blue-700 underline">
          Ponete al día con tu aporte
        </Link>
      </div>
    );
  }

  async function publicar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/oficios/${oficioId}/promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          descripcion,
          precioAntes: aNumero(precioAntes),
          precioAhora: aNumero(precioAhora),
          imagen,
          duracion,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return setError(d.error ?? "No se pudo publicar la promo.");
      }
      setAbierto(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error de red.");
    } finally {
      setCargando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full min-h-[48px] rounded-xl border-2 border-orange-400 text-orange-700 font-semibold hover:bg-orange-50"
      >
        🔥 Cargar una promo
      </button>
    );
  }

  const campo =
    "mt-1.5 block w-full border border-gray-300 rounded-xl px-3 py-2 text-base text-gray-900 bg-white";

  return (
    <div className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
      <h2 className="font-bold text-gray-900">🔥 Nueva promo</h2>
      <label className="block text-sm font-medium text-gray-700">
        Título
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={80}
          placeholder="Ej: Corte de pasto 20% off esta semana"
          className={campo}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Detalle <span className="font-normal text-gray-500">(opcional)</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Condiciones, qué incluye, hasta cuándo tomás pedidos…"
          className={campo}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium text-gray-700">
          Precio antes <span className="font-normal text-gray-500">(opcional)</span>
          <input
            value={precioAntes}
            onChange={(e) => setPrecioAntes(e.target.value)}
            inputMode="numeric"
            placeholder="$ 10.000"
            className={campo}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Precio ahora <span className="font-normal text-gray-500">(opcional)</span>
          <input
            value={precioAhora}
            onChange={(e) => setPrecioAhora(e.target.value)}
            inputMode="numeric"
            placeholder="$ 8.000"
            className={campo}
          />
        </label>
      </div>
      <ImageUpload label="Foto (opcional)" value={imagen} onChange={setImagen} />
      <fieldset>
        <legend className="text-sm font-medium text-gray-700">Duración</legend>
        <div className="mt-1.5 flex gap-2">
          {(Object.keys(DURACION_PROMO) as Duracion[]).map((d) => (
            <label
              key={d}
              className={`flex-1 min-h-[44px] flex items-center justify-center rounded-xl border-2 text-sm font-semibold cursor-pointer ${
                duracion === d
                  ? "border-orange-500 bg-white text-orange-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <input
                type="radio"
                name="duracion"
                value={d}
                checked={duracion === d}
                onChange={() => setDuracion(d)}
                className="sr-only"
              />
              {DURACION_PROMO[d].label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Al vencer se borra sola. Podés sacarla antes cuando quieras.
        </p>
      </fieldset>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={publicar}
          disabled={cargando}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {cargando ? "Publicando…" : "Publicar promo"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="min-h-[44px] px-4 py-2 text-sm text-gray-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
