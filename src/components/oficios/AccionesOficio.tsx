"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRUPO_OFICIO, ORDEN_GRUPOS } from "@/lib/oficios";

async function enviar(
  url: string,
  init: RequestInit,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (res.ok) return { ok: true };
    const d = await res.json().catch(() => ({}));
    return { ok: false, error: d.error ?? "No se pudo completar la acción." };
  } catch {
    return { ok: false, error: "Ocurrió un error de red." };
  }
}

/** "Recomiendo" con comentario opcional, o quitar la recomendación propia. */
export function RecomendarPanel({
  oficioId,
  yaRecomendado,
}: {
  oficioId: number;
  yaRecomendado: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recomendar() {
    setCargando(true);
    setError(null);
    const r = await enviar(`/api/oficios/${oficioId}/recomendaciones`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    });
    setCargando(false);
    if (!r.ok) return setError(r.error);
    setAbierto(false);
    setComentario("");
    router.refresh();
  }

  async function quitar() {
    if (!confirm("¿Quitar tu recomendación?")) return;
    setCargando(true);
    const r = await enviar(`/api/oficios/${oficioId}/recomendaciones`, {
      method: "DELETE",
    });
    setCargando(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  }

  if (yaRecomendado) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold text-green-700">✓ Lo recomendaste</span>
        <button
          type="button"
          onClick={quitar}
          disabled={cargando}
          className="text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
        >
          Quitar recomendación
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="min-h-[44px] px-4 py-2 rounded-xl border-2 border-blue-600 text-blue-700 text-sm font-semibold hover:bg-blue-50"
      >
        👍 Lo contraté y lo recomiendo
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <label className="block text-sm font-medium text-gray-700">
        Contá tu experiencia <span className="font-normal text-gray-500">(opcional)</span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ej: Vino en el día, trabajo prolijo y buen precio."
          className="mt-1.5 block w-full border border-gray-300 rounded-xl px-3 py-2 text-base text-gray-900 bg-white"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={recomendar}
          disabled={cargando}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {cargando ? "Enviando…" : "Recomendar"}
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

/** "Reportar un problema" — privado, le llega solo al admin. */
export function ReportarProblema({ oficioId }: { oficioId: number }) {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);

  async function reportar() {
    setEstado("enviando");
    setError(null);
    const r = await enviar(`/api/oficios/${oficioId}/reportes`, {
      method: "POST",
      body: JSON.stringify({ detalle }),
    });
    if (!r.ok) {
      setEstado("idle");
      return setError(r.error);
    }
    setEstado("ok");
  }

  if (estado === "ok") {
    return (
      <p role="status" className="text-sm text-gray-600">
        Gracias, el reporte le llegó al administrador. No se muestra en la
        publicación.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Tuve un problema con este servicio
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <label className="block text-sm font-medium text-gray-700">
        ¿Qué pasó?
        <textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          rows={3}
          maxLength={1000}
          className="mt-1.5 block w-full border border-gray-300 rounded-xl px-3 py-2 text-base text-gray-900 bg-white"
        />
      </label>
      <p className="text-xs text-gray-500">
        Es privado: lo ve solo el administrador, no el vecino ni el resto del
        barrio.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reportar}
          disabled={estado === "enviando"}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {estado === "enviando" ? "Enviando…" : "Enviar al administrador"}
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

/** Borrar la publicación (dueño o admin). */
export function BorrarOficio({ oficioId }: { oficioId: number }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function borrar() {
    if (
      !confirm(
        "¿Borrar esta publicación? Se pierden también sus recomendaciones.",
      )
    )
      return;
    setCargando(true);
    const r = await enviar(`/api/oficios/${oficioId}`, { method: "DELETE" });
    if (!r.ok) {
      setCargando(false);
      alert(r.error);
      return;
    }
    router.push("/oficios");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={borrar}
      disabled={cargando}
      className="min-h-[44px] px-4 py-2 rounded-xl border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
    >
      Borrar
    </button>
  );
}

/** Moderación del admin: aprobar / rechazar / pausar / reactivar. */
export function ModerarOficio({
  oficioId,
  estado,
  categoriaSugerida,
}: {
  oficioId: number;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "PAUSADO";
  categoriaSugerida: string | null;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crearRubro, setCrearRubro] = useState(!!categoriaSugerida);
  const [nombreRubro, setNombreRubro] = useState(categoriaSugerida ?? "");
  const [grupoRubro, setGrupoRubro] = useState("OTROS");

  async function moderar(accion: "aprobar" | "rechazar" | "pausar" | "reactivar") {
    setCargando(true);
    setError(null);
    let categoriaId: number | undefined;
    // Aprobar con rubro sugerido: primero se crea la categoría y se reasigna.
    if (accion === "aprobar" && categoriaSugerida && crearRubro) {
      const res = await fetch("/api/oficios/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreRubro, grupo: grupoRubro }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCargando(false);
        return setError(d.error ?? "No se pudo crear el rubro.");
      }
      categoriaId = d.id;
    }
    const r = await enviar(`/api/oficios/${oficioId}/estado`, {
      method: "POST",
      body: JSON.stringify({ accion, motivo, categoriaId }),
    });
    setCargando(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  }

  const necesitaMotivo = estado === "PENDIENTE" || estado === "APROBADO";

  return (
    <div className="space-y-3">
      {estado === "PENDIENTE" && categoriaSugerida && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2 text-sm">
          <p className="text-amber-900">
            Rubro sugerido: <strong>{categoriaSugerida}</strong>
          </p>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={crearRubro}
              onChange={(e) => setCrearRubro(e.target.checked)}
            />
            Crear el rubro al aprobar
          </label>
          {crearRubro && (
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={nombreRubro}
                onChange={(e) => setNombreRubro(e.target.value)}
                aria-label="Nombre del rubro"
                className="border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
              />
              <select
                value={grupoRubro}
                onChange={(e) => setGrupoRubro(e.target.value)}
                aria-label="Grupo del rubro"
                className="border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
              >
                {ORDEN_GRUPOS.map((g) => (
                  <option key={g} value={g}>
                    {GRUPO_OFICIO[g].label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {necesitaMotivo && (
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={
            estado === "PENDIENTE"
              ? "Motivo si la rechazás (lo ve el vecino)"
              : "Motivo si la pausás (lo ve el vecino)"
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {estado === "PENDIENTE" && (
          <>
            <button
              type="button"
              onClick={() => moderar("aprobar")}
              disabled={cargando}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => moderar("rechazar")}
              disabled={cargando || !motivo.trim()}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-50"
            >
              Rechazar
            </button>
          </>
        )}
        {estado === "APROBADO" && (
          <button
            type="button"
            onClick={() => moderar("pausar")}
            disabled={cargando || !motivo.trim()}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-gray-400 text-gray-700 text-sm font-semibold disabled:opacity-50"
          >
            Pausar publicación
          </button>
        )}
        {estado === "PAUSADO" && (
          <button
            type="button"
            onClick={() => moderar("reactivar")}
            disabled={cargando}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
}
