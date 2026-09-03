"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ESTADO_COBRANZA_LABEL,
  METODO_PAGO_LABEL,
  formatoPesos,
  periodoLabel,
  type EstadoCobranza,
} from "@/lib/cobranza";
import { MetodoPago } from "@/generated/enums";

export interface FilaCobranza {
  id: number;
  nombre: string;
  lote: string;
  estado: EstadoCobranza;
  vigenteHasta: string | null;
  montoMensual: number;
  montoPropio: number | null;
  exento: boolean;
  notaInterna: string | null;
  ultimoPago: { id: number; periodo: string; monto: number } | null;
}

const BADGE: Record<EstadoCobranza, string> = {
  al_dia: "bg-green-100 text-green-700",
  vencida: "bg-red-100 text-red-700",
  sin_datos: "bg-gray-100 text-gray-500",
  exento: "bg-blue-100 text-blue-700",
};

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CobranzaTabla({
  filas,
  periodoActual,
}: {
  filas: FilaCobranza[];
  periodoActual: string;
}) {
  const [abierta, setAbierta] = useState<FilaCobranza | null>(null);

  if (filas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No hay usuarios con ese filtro.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Usuario</span>
          <span>Estado</span>
          <span>Vigente hasta</span>
          <span>Último pago</span>
          <span>Cuota</span>
          <span></span>
        </div>

        <div className="divide-y divide-gray-100">
          {filas.map((f) => (
            <div
              key={f.id}
              className="grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 items-center"
            >
              <div>
                <p className="font-medium text-sm text-gray-900">{f.nombre}</p>
                <p className="text-xs text-gray-400 font-mono">{f.lote}</p>
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap justify-self-start ${BADGE[f.estado]}`}
              >
                {ESTADO_COBRANZA_LABEL[f.estado]}
              </span>

              <span className="text-sm text-gray-600 whitespace-nowrap">
                <span className="sm:hidden text-gray-400">Vigente: </span>
                {fmtFecha(f.vigenteHasta)}
              </span>

              <span className="text-sm text-gray-600 whitespace-nowrap">
                <span className="sm:hidden text-gray-400">Últ. pago: </span>
                {f.ultimoPago
                  ? `${periodoLabel(f.ultimoPago.periodo)} · ${formatoPesos(f.ultimoPago.monto)}`
                  : "—"}
              </span>

              <span className="text-sm text-gray-600 whitespace-nowrap">
                <span className="sm:hidden text-gray-400">Cuota: </span>
                {formatoPesos(f.montoMensual)}
                {f.montoPropio != null && (
                  <span className="text-xs text-gray-400"> (propia)</span>
                )}
              </span>

              <button
                onClick={() => setAbierta(f)}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors whitespace-nowrap justify-self-start sm:justify-self-auto"
              >
                Gestionar
              </button>
            </div>
          ))}
        </div>
      </div>

      {abierta && (
        <GestionDialog
          fila={abierta}
          periodoActual={periodoActual}
          onClose={() => setAbierta(null)}
        />
      )}
    </>
  );
}

function GestionDialog({
  fila,
  periodoActual,
  onClose,
}: {
  fila: FilaCobranza;
  periodoActual: string;
  onClose: () => void;
}) {
  const router = useRouter();

  const [periodo, setPeriodo] = useState(periodoActual);
  const [monto, setMonto] = useState(String(fila.montoMensual));
  const [metodo, setMetodo] = useState<string>(MetodoPago.TRANSFERENCIA);
  const [nota, setNota] = useState("");

  const [exento, setExento] = useState(fila.exento);
  const [montoPropio, setMontoPropio] = useState(
    fila.montoPropio != null ? String(fila.montoPropio) : "",
  );
  const [notaInterna, setNotaInterna] = useState(fila.notaInterna ?? "");

  const [cargando, setCargando] = useState<null | "pago" | "ajustes" | "borrar">(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const cerrarYRefrescar = () => {
    onClose();
    router.refresh();
  };

  async function registrarPago() {
    setError(null);
    setCargando("pago");
    try {
      const res = await fetch("/api/cobranza/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: fila.id,
          periodo,
          monto: Number(monto),
          metodo,
          nota: nota.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo registrar el pago.");
      }
      cerrarYRefrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setCargando(null);
    }
  }

  async function guardarAjustes() {
    setError(null);
    setCargando("ajustes");
    try {
      const res = await fetch(`/api/cobranza/suscripcion/${fila.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exento,
          montoMensual: montoPropio.trim() ? Number(montoPropio) : null,
          notaInterna: notaInterna.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudieron guardar los ajustes.");
      }
      cerrarYRefrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setCargando(null);
    }
  }

  async function borrarUltimoPago() {
    if (!fila.ultimoPago) return;
    if (
      !confirm(
        `¿Borrar el pago de ${periodoLabel(fila.ultimoPago.periodo)}? Se recalcula la vigencia.`,
      )
    )
      return;
    setError(null);
    setCargando("borrar");
    try {
      const res = await fetch(
        `/api/cobranza/pagos/${fila.ultimoPago.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo borrar el pago.");
      }
      cerrarYRefrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setCargando(null);
    }
  }

  const bloqueado = cargando !== null;

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-5 space-y-5">
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {fila.nombre}
              </DialogTitle>
              <p className="text-sm text-gray-500 font-mono">{fila.lote}</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Registrar pago */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Registrar pago
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-500">
                  Período
                  <input
                    type="month"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Monto ($)
                  <input
                    type="number"
                    inputMode="numeric"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Método
                  <select
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white"
                  >
                    {Object.values(MetodoPago).map((m) => (
                      <option key={m} value={m}>
                        {METODO_PAGO_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-500">
                  Nota (opcional)
                  <input
                    type="text"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                  />
                </label>
              </div>
              <button
                onClick={registrarPago}
                disabled={bloqueado || !periodo || !monto}
                className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {cargando === "pago" ? "Registrando…" : "Registrar pago"}
              </button>
              {fila.ultimoPago && (
                <button
                  onClick={borrarUltimoPago}
                  disabled={bloqueado}
                  className="w-full text-xs text-red-600 hover:underline disabled:opacity-60"
                >
                  Borrar último pago ({periodoLabel(fila.ultimoPago.periodo)})
                </button>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Ajustes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Ajustes</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={exento}
                  onChange={(e) => setExento(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Exento de pago (no cuenta como deudor)
              </label>
              <label className="block text-xs text-gray-500">
                Cuota mensual propia ($) — vacío = usar la general
                <input
                  type="number"
                  inputMode="numeric"
                  value={montoPropio}
                  onChange={(e) => setMontoPropio(e.target.value)}
                  placeholder={String(fila.montoMensual)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs text-gray-500">
                Nota interna
                <input
                  type="text"
                  value={notaInterna}
                  onChange={(e) => setNotaInterna(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                />
              </label>
              <button
                onClick={guardarAjustes}
                disabled={bloqueado}
                className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {cargando === "ajustes" ? "Guardando…" : "Guardar ajustes"}
              </button>
            </div>

            <button
              onClick={onClose}
              disabled={bloqueado}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
