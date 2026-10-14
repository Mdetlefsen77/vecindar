"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/forms/ImageUpload";
import {
  CATEGORIA_OTROS,
  GRUPO_OFICIO,
  agruparCategorias,
  type CategoriaOpcion,
} from "@/lib/oficios";

export interface ValoresOficio {
  categoriaId: number | null;
  categoriaSugerida: string | null;
  titulo: string;
  descripcion: string;
  disponibilidad: string | null;
  telefono: string;
  imagenes: string[];
}

const NO_ESTA = "no-esta";

const INPUT =
  "mt-1.5 block w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-900";

export default function OficioForm({
  oficioId,
  inicial,
  categorias,
}: {
  oficioId?: number;
  inicial: ValoresOficio;
  categorias: CategoriaOpcion[];
}) {
  const router = useRouter();
  const otros = categorias.find((c) => c.nombre === CATEGORIA_OTROS);
  const [v, setV] = useState(inicial);
  // "Mi rubro no está" = categoría Otros + texto sugerido.
  const [noEsta, setNoEsta] = useState(
    !!inicial.categoriaSugerida && inicial.categoriaId === otros?.id,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ValoresOficio>(k: K, valor: ValoresOficio[K]) =>
    setV((prev) => ({ ...prev, [k]: valor }));

  function elegirRubro(valor: string) {
    if (valor === NO_ESTA) {
      setNoEsta(true);
      set("categoriaId", otros?.id ?? null);
    } else {
      setNoEsta(false);
      setV((prev) => ({
        ...prev,
        categoriaId: valor ? Number(valor) : null,
        categoriaSugerida: null,
      }));
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!v.categoriaId) {
      setError("Elegí un rubro.");
      return;
    }
    if (noEsta && !v.categoriaSugerida?.trim()) {
      setError("Escribí cuál es tu rubro.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(oficioId ? `/api/oficios/${oficioId}` : "/api/oficios", {
        method: oficioId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...v,
          categoriaSugerida: noEsta ? v.categoriaSugerida : null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      router.push(`/oficios/${d.id}${oficioId ? "" : "?nuevo=1"}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setEnviando(false);
    }
  }

  const grupos = agruparCategorias(
    categorias.filter((c) => c.nombre !== CATEGORIA_OTROS),
  );

  return (
    <form onSubmit={guardar} className="space-y-5">
      <label className="block text-sm font-medium text-gray-700">
        Rubro
        <select
          value={noEsta ? NO_ESTA : (v.categoriaId ?? "")}
          onChange={(e) => elegirRubro(e.target.value)}
          required
          className={`${INPUT} bg-white`}
        >
          <option value="">Elegí tu rubro…</option>
          {grupos.map((g) => (
            <optgroup
              key={g.grupo}
              label={`${GRUPO_OFICIO[g.grupo].emoji} ${GRUPO_OFICIO[g.grupo].label}`}
            >
              {g.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </optgroup>
          ))}
          {otros && <option value={NO_ESTA}>✨ Mi rubro no está en la lista</option>}
        </select>
      </label>

      {noEsta && (
        <label className="block text-sm font-medium text-gray-700">
          ¿Cuál es tu rubro?
          <input
            type="text"
            value={v.categoriaSugerida ?? ""}
            onChange={(e) => set("categoriaSugerida", e.target.value)}
            maxLength={60}
            placeholder="Ej: Afilado de cuchillos"
            className={INPUT}
          />
          <span className="block mt-1 text-xs font-normal text-gray-500">
            Se lo pasamos al administrador para que lo sume a la lista.
          </span>
        </label>
      )}

      <label className="block text-sm font-medium text-gray-700">
        Título
        <input
          type="text"
          value={v.titulo}
          onChange={(e) => set("titulo", e.target.value)}
          required
          maxLength={80}
          placeholder="Ej: Plomería y destapaciones"
          className={INPUT}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        ¿Qué ofrecés?
        <textarea
          value={v.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          required
          rows={5}
          maxLength={1500}
          placeholder="Contá qué trabajos hacés, tu experiencia, si das presupuesto sin cargo…"
          className={INPUT}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Disponibilidad <span className="font-normal text-gray-500">(opcional)</span>
        <input
          type="text"
          value={v.disponibilidad ?? ""}
          onChange={(e) => set("disponibilidad", e.target.value)}
          maxLength={200}
          placeholder="Ej: Lunes a sábados de 8 a 18, también urgencias"
          className={INPUT}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        WhatsApp de contacto
        <input
          type="tel"
          inputMode="tel"
          value={v.telefono}
          onChange={(e) => set("telefono", e.target.value)}
          required
          placeholder="Ej: 351 1234567"
          className={INPUT}
        />
        <span className="block mt-1 text-xs font-normal text-gray-500">
          Solo lo ven los vecinos registrados en Vecindar.
        </span>
      </label>

      <ImageUpload
        label="📸 Fotos de tu servicio"
        ayuda={
          <>
            <strong>La primera foto es la portada de tu tarjeta.</strong> Elegí
            la que mejor muestre lo que hacés: tu logo, una foto tuya
            trabajando o tu mejor trabajo terminado. Evitá capturas de
            pantalla, fotos borrosas o con mucho texto. Podés cambiar la
            portada tocando «★ Portada» en otra foto.
          </>
        }
        multiple
        portada
        maxFiles={6}
        value={v.imagenes}
        onChange={(urls) => set("imagenes", urls)}
      />

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors"
      >
        {enviando
          ? "Guardando…"
          : oficioId
            ? "Guardar cambios"
            : "Enviar a revisión"}
      </button>
      {!oficioId && (
        <p className="text-xs text-gray-500 text-center">
          El administrador revisa cada publicación antes de que aparezca en el
          catálogo.
        </p>
      )}
    </form>
  );
}
