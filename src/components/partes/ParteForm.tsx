"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/forms/ImageUpload";
import {
  CIRCULACION_LABEL,
  ORDEN_TURNOS,
  RONDA_LABEL,
  TURNOS,
  horarioTurno,
  mensajeParte,
} from "@/lib/partes";
import type {
  EstadoRonda,
  NivelCirculacion,
  TurnoGuardia,
} from "@/generated/enums";

export interface ValoresParte {
  fecha: string; // "YYYY-MM-DD"
  turno: TurnoGuardia;
  ronda: EstadoRonda;
  circulacion: NivelCirculacion;
  presenciaPolicial: boolean;
  recomendacion: string;
  novedades: string | null;
  imagenes: string[];
}

/** Incidente / alerta del período, para sumar a las novedades con un toque. */
export interface SugerenciaNovedad {
  clave: string;
  texto: string;
}

interface Props {
  /** Presente al editar un parte existente. */
  parteId?: number;
  inicial: ValoresParte;
  sugerencias?: SugerenciaNovedad[];
}

/** Grupo de botones tipo "segmented control" — más rápido que un select en el celular. */
function Opciones<T extends string>({
  legend,
  opciones,
  valor,
  onChange,
}: {
  legend: string;
  opciones: { valor: T; label: string; detalle?: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700 mb-1.5">
        {legend}
      </legend>
      <div
        className={`grid gap-2 ${opciones.length === 4 ? "grid-cols-2 sm:grid-cols-4" : opciones.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(o.valor)}
              className={`min-h-[44px] px-2 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                activo
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {o.label}
              {o.detalle && (
                <span className="block text-xs font-normal text-gray-500">
                  {o.detalle}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function ParteForm({ parteId, inicial, sugerencias = [] }: Props) {
  const router = useRouter();
  const [v, setV] = useState<ValoresParte>(inicial);
  const [hayNovedades, setHayNovedades] = useState(!!inicial.novedades);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existenteId, setExistenteId] = useState<number | null>(null);

  const set = <K extends keyof ValoresParte>(k: K, valor: ValoresParte[K]) =>
    setV((prev) => ({ ...prev, [k]: valor }));

  // Al cambiar de turno, la recomendación sigue al turno salvo que la
  // guardia ya la haya personalizado.
  function cambiarTurno(turno: TurnoGuardia) {
    setV((prev) => ({
      ...prev,
      turno,
      recomendacion:
        prev.recomendacion === TURNOS[prev.turno].recomendacion
          ? TURNOS[turno].recomendacion
          : prev.recomendacion,
    }));
  }

  function agregarNovedad(texto: string) {
    setHayNovedades(true);
    setV((prev) => ({
      ...prev,
      novedades: prev.novedades?.trim()
        ? `${prev.novedades.trim()}\n${texto}`
        : texto,
    }));
  }

  const novedadesFinales = hayNovedades ? v.novedades?.trim() || null : null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (hayNovedades && !novedadesFinales) {
      setError('Escribí las novedades o marcá "Sin novedades".');
      return;
    }
    setError(null);
    setExistenteId(null);
    setEnviando(true);
    try {
      const res = await fetch(parteId ? `/api/partes/${parteId}` : "/api/partes", {
        method: parteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, novedades: novedadesFinales }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.existenteId) setExistenteId(d.existenteId);
        throw new Error(d.error ?? "No se pudo guardar el parte.");
      }
      router.push(`/partes/${d.id}${parteId ? "" : "?nuevo=1"}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setEnviando(false);
    }
  }

  const vistaPrevia = mensajeParte({
    ...v,
    novedades: novedadesFinales,
    cantidadFotos: v.imagenes.length,
  });

  return (
    <form onSubmit={guardar} className="space-y-5">
      <div className="grid grid-cols-1 gap-5">
        <label className="block text-sm font-medium text-gray-700">
          Fecha
          <input
            type="date"
            value={v.fecha}
            onChange={(e) => set("fecha", e.target.value)}
            required
            className="mt-1.5 block w-full sm:w-56 border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-900"
          />
        </label>

        <Opciones
          legend="Turno"
          valor={v.turno}
          onChange={cambiarTurno}
          opciones={ORDEN_TURNOS.map((t) => ({
            valor: t,
            label: TURNOS[t].label,
            detalle: horarioTurno(t),
          }))}
        />

        <Opciones
          legend="⭕ Ronda de patrullaje"
          valor={v.ronda}
          onChange={(r) => set("ronda", r)}
          opciones={(Object.keys(RONDA_LABEL) as EstadoRonda[]).map((r) => ({
            valor: r,
            label: RONDA_LABEL[r],
          }))}
        />

        <Opciones
          legend="🛵🚲🚘 Circulación barrial"
          valor={v.circulacion}
          onChange={(c) => set("circulacion", c)}
          opciones={(Object.keys(CIRCULACION_LABEL) as NivelCirculacion[]).map(
            (c) => ({ valor: c, label: CIRCULACION_LABEL[c] }),
          )}
        />

        <Opciones
          legend="👮🏻 Presencia policial"
          valor={v.presenciaPolicial ? "SI" : "NO"}
          onChange={(p) => set("presenciaPolicial", p === "SI")}
          opciones={[
            { valor: "SI", label: "Sí" },
            { valor: "NO", label: "No" },
          ]}
        />

        <label className="block text-sm font-medium text-gray-700">
          ⚠️ Recomendación a los vecinos
          <textarea
            value={v.recomendacion}
            onChange={(e) => set("recomendacion", e.target.value)}
            rows={2}
            maxLength={300}
            className="mt-1.5 block w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-900"
          />
        </label>

        <div className="space-y-2">
          <Opciones
            legend="📝 Novedades"
            valor={hayNovedades ? "CON" : "SIN"}
            onChange={(n) => setHayNovedades(n === "CON")}
            opciones={[
              { valor: "SIN", label: "Sin novedades" },
              { valor: "CON", label: "Hubo novedades" },
            ]}
          />

          {sugerencias.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-900">
                Reportado en la app desde el último parte — tocá para sumarlo:
              </p>
              <ul className="space-y-1.5">
                {sugerencias.map((s) => {
                  const agregada = !!v.novedades?.includes(s.texto);
                  return (
                    <li key={s.clave}>
                      <button
                        type="button"
                        disabled={agregada && hayNovedades}
                        onClick={() => agregarNovedad(s.texto)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white border border-amber-200 text-gray-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {agregada && hayNovedades ? "✓ " : "+ "}
                        {s.texto}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {hayNovedades && (
            <textarea
              value={v.novedades ?? ""}
              onChange={(e) => set("novedades", e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="Qué pasó, dónde y a qué hora"
              aria-label="Detalle de las novedades"
              className="block w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-900"
            />
          )}
        </div>

        <ImageUpload
          label="📸 Fotos"
          multiple
          maxFiles={6}
          value={v.imagenes}
          onChange={(urls) => set("imagenes", urls)}
        />
      </div>

      <details className="rounded-xl border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700">
          Vista previa del mensaje
        </summary>
        <pre className="px-4 pb-4 whitespace-pre-wrap font-sans text-sm text-gray-800">
          {vistaPrevia}
        </pre>
      </details>

      {error && (
        <div
          role="alert"
          className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2"
        >
          {error}
          {existenteId && (
            <>
              {" "}
              <Link
                href={`/partes/${existenteId}/editar`}
                className="font-semibold underline"
              >
                Editar el parte existente
              </Link>
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors"
      >
        {enviando ? "Guardando…" : parteId ? "Guardar cambios" : "Guardar parte"}
      </button>
    </form>
  );
}
