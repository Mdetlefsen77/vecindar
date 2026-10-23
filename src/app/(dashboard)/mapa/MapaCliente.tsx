"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { IncidentePin } from "@/components/map/IncidentesLayer";
import type { AlertaPin } from "@/components/map/AlertasLayer";
import type { OficioPin } from "@/components/map/OficiosLayer";
import type { Foco } from "@/components/map/MapView";
import TituloSeccion from "@/components/ui/TituloSeccion";
import { tiempoRelativo } from "@/lib/fechas";

// Importar el mapa con SSR deshabilitado (Leaflet solo funciona en el cliente)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-base text-gray-600">Cargando mapa…</p>
      </div>
    </div>
  ),
});

// Las búsquedas de lotes usan los GeoJSON del barrio (~300 kB): se cargan
// recién cuando hacen falta, igual que el mapa.
const cargarLotes = () => import("@/lib/barrio/lotes");

type LayerKey = "manzanas" | "incidentes" | "oficios" | "alertas";

const LAYER_LABELS: Record<LayerKey, string> = {
  manzanas: "Manzanas",
  incidentes: "Incidentes",
  oficios: "Servicios",
  alertas: "Alertas SOS",
};

// Botón de capa activo en el color de lo que muestra.
const CAPA_ACTIVA: Record<LayerKey, string> = {
  manzanas: "bg-blue-50 border-blue-500 text-blue-800",
  incidentes: "bg-orange-50 border-orange-500 text-orange-800",
  oficios: "bg-indigo-50 border-indigo-500 text-indigo-800",
  alertas: "bg-red-50 border-red-500 text-red-700",
};

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "3 meses" },
] as const;

// La guardia necesita ver un SOS nuevo sin recargar; al vecino le alcanza
// con un refresco tranquilo de los incidentes.
const REFRESCO_GUARDIA_MS = 20_000;
const REFRESCO_VECINO_MS = 60_000;

export default function MapaCliente({
  miLote,
  oficios,
  soloOficios,
  oficiosDe,
  rubro,
  verSos,
  detalleLotes,
}: {
  /** Número del lote del usuario. */
  miLote: string | null;
  /** Oficios publicados, ubicados por la manzana de su dueño. */
  oficios: OficioPin[];
  /** Se llegó desde Oficios: arranca mostrando solo manzanas y oficios. */
  soloOficios: boolean;
  /** Manzana de un oficio: el mapa va ahí y abre su lista. */
  oficiosDe: string | null;
  /** Rubro elegido en Oficios: los oficios ya vienen filtrados. */
  rubro: string | null;
  /** Guardia y admin: capa de alertas SOS de todo el barrio. */
  verSos: boolean;
  /** Guardia y admin: quién vive en cada lote. */
  detalleLotes: boolean;
}) {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    manzanas: true,
    incidentes: !soloOficios,
    oficios: true,
    alertas: verSos && !soloOficios,
  });
  const [dias, setDias] = useState<number>(30);

  const [incidentes, setIncidentes] = useState<IncidentePin[]>([]);
  const [alertas, setAlertas] = useState<AlertaPin[]>([]);
  const [loading, setLoading] = useState(true);

  const [foco, setFoco] = useState<Foco | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [miCasa, setMiCasa] = useState<{
    manzana: string;
    link: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [incRes, alertRes] = await Promise.all([
        fetch(`/api/incidentes?dias=${dias}`),
        verSos ? fetch("/api/panico") : null,
      ]);

      if (incRes.ok) {
        const data = await incRes.json();
        setIncidentes(
          (data as IncidentePin[]).filter(
            (i) => i.latitud != null && i.longitud != null,
          ),
        );
      }
      if (alertRes?.ok) {
        const data = await alertRes.json();
        setAlertas(
          (data as AlertaPin[]).filter(
            (a) => a.latitud != null && a.longitud != null,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [dias, verSos]);

  useEffect(() => {
    void fetchData();
    const id = setInterval(
      () => {
        if (!document.hidden) void fetchData();
      },
      verSos ? REFRESCO_GUARDIA_MS : REFRESCO_VECINO_MS,
    );
    return () => clearInterval(id);
  }, [fetchData, verSos]);

  // Viniendo de un oficio, lo que importa es el mapa: bajar hasta él.
  useEffect(() => {
    if (oficiosDe) {
      document
        .getElementById("mapa-barrio")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [oficiosDe]);

  // Datos de "tu casa" para el link de cómo llegar.
  useEffect(() => {
    if (!miLote) return;
    void cargarLotes().then(({ ubicarLote, linkComoLlegar }) => {
      const r = ubicarLote(miLote);
      if (r) {
        setMiCasa({
          manzana: r.manzana.numero,
          link: linkComoLlegar(r.lote.centro),
        });
      }
    });
  }, [miLote]);

  async function irALote(numero: string): Promise<boolean> {
    const { ubicarLote } = await cargarLotes();
    const r = ubicarLote(numero);
    if (!r) return false;
    setLayers((prev) => ({ ...prev, manzanas: true }));
    setFoco({
      centro: r.lote.centro,
      manzanaId: r.manzana.id,
      lote: r.lote.numero,
      n: Date.now(),
    });
    return true;
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const numero = busqueda.trim();
    if (!numero) return;
    const ok = await irALote(numero);
    setErrorBusqueda(
      ok ? null : `No encontramos el lote ${numero}. Revisá el número.`,
    );
  }

  function verAlerta(a: AlertaPin) {
    setLayers((prev) => ({ ...prev, alertas: true }));
    setFoco({ centro: [a.latitud, a.longitud], n: Date.now() });
  }

  const mensajeCasa = miCasa
    ? `Para llegar a mi casa: Manzana ${miCasa.manzana}, lote ${miLote}. Tocá este link y Google Maps te lleva: ${miCasa.link}`
    : "";

  async function compartirCasa() {
    if (!mensajeCasa) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: mensajeCasa });
      } catch {
        // el usuario canceló el share nativo — no es un error a mostrar
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(mensajeCasa)}`,
      "_blank",
    );
  }

  async function copiarCasa() {
    if (!mensajeCasa) return;
    try {
      await navigator.clipboard.writeText(mensajeCasa);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard puede fallar sin permisos/HTTPS
    }
  }

  function toggleLayer(key: LayerKey) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const capas = (Object.keys(LAYER_LABELS) as LayerKey[]).filter(
    (k) => k !== "alertas" || verSos,
  );
  const alertasActivas = alertas.filter((a) => a.estado !== "CERRADO");
  const incidentesActivos = incidentes.filter(
    (i) => i.estado === "ACTIVO",
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div>
        <TituloSeccion seccion="mapa">Mapa del barrio</TituloSeccion>
        <p className="mt-2 text-base text-gray-600">
          Buscá un lote, ubicá tu casa y mirá lo que pasó cerca.
        </p>
      </div>

      {soloOficios && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="flex-1 min-w-[12rem] text-base text-indigo-900">
            {rubro ? (
              <>
                🧰 Mostrando solo <strong>{rubro}</strong>
              </>
            ) : (
              <>🧰 Oficios y servicios de los vecinos, por manzana</>
            )}
          </p>
          {rubro && (
            <Link
              href="/mapa?capa=oficios"
              className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-white border-2 border-indigo-300 text-indigo-800 text-base font-semibold hover:bg-indigo-100"
            >
              Ver todos
            </Link>
          )}
          <Link
            href="/oficios"
            className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-white border-2 border-indigo-300 text-indigo-800 text-base font-semibold hover:bg-indigo-100"
          >
            ← Volver a la lista
          </Link>
        </div>
      )}

      {/* SOS activos: para la guardia, arriba de todo y con acceso directo */}
      {verSos && alertasActivas.length > 0 && (
        <ul className="space-y-2" aria-label="Alertas SOS activas">
          {alertasActivas.map((a) => {
            const lote = a.usuario?.lote;
            const tel = a.usuario?.telefono?.replace(/[^\d+]/g, "");
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-red-600 text-white p-4 shadow-[0_6px_18px_rgba(220,38,38,0.35)]"
              >
                <span className="text-2xl" aria-hidden="true">
                  🆘
                </span>
                <div className="flex-1 min-w-[10rem]">
                  <p className="text-lg font-bold leading-tight">
                    SOS de {a.usuario?.nombre ?? "un vecino"}
                  </p>
                  <p className="text-base text-red-50">
                    {lote
                      ? `Manzana ${lote.manzana.numero} · Lote ${lote.numero} · `
                      : ""}
                    {tiempoRelativo(new Date(a.createdAt))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => verAlerta(a)}
                    className="min-h-[48px] px-4 rounded-xl bg-white text-red-700 text-base font-bold hover:bg-red-50"
                  >
                    Ver en el mapa
                  </button>
                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      className="min-h-[48px] inline-flex items-center px-4 rounded-xl bg-red-800 text-white text-base font-bold hover:bg-red-900"
                    >
                      📞 Llamar
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Mi casa + buscar lote */}
      <div className="flex flex-col sm:flex-row gap-3">
        {miLote && (
          <button
            onClick={() => void irALote(miLote)}
            className="min-h-[52px] inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base font-bold"
          >
            <span aria-hidden="true">🏠</span> Ver mi casa
          </button>
        )}
        <form onSubmit={buscar} role="search" className="flex flex-1 gap-2">
          <label htmlFor="buscar-lote" className="sr-only">
            Número de lote
          </label>
          <input
            id="buscar-lote"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setErrorBusqueda(null);
            }}
            placeholder="Buscar un lote (ej: 130)"
            className="flex-1 min-w-0 min-h-[52px] border border-gray-300 rounded-xl px-4 text-base"
          />
          <button
            type="submit"
            className="min-h-[52px] px-5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-base font-bold"
          >
            Buscar
          </button>
        </form>
      </div>
      {errorBusqueda && (
        <p role="alert" className="text-base font-medium text-red-700">
          {errorBusqueda}
        </p>
      )}

      {/* Capas y período */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" aria-label="Qué mostrar">
          {capas.map((key) => {
            const active = layers[key];
            const isAlerta = key === "alertas";
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                aria-pressed={active}
                className={`min-h-[48px] px-4 rounded-xl text-base font-semibold border-2 transition-colors inline-flex items-center gap-2 ${
                  active
                    ? CAPA_ACTIVA[key]
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span aria-hidden="true">{active ? "✓" : "○"}</span>
                {LAYER_LABELS[key]}
                {isAlerta && alertasActivas.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-sm font-bold bg-red-600 text-white rounded-full">
                    {alertasActivas.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {layers.incidentes && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full sm:w-auto text-base text-gray-700">
              Incidentes de los últimos:
            </span>
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                onClick={() => setDias(p.dias)}
                aria-pressed={dias === p.dias}
                className={`min-h-[44px] px-3 rounded-xl text-base font-semibold border-2 ${
                  dias === p.dias
                    ? "bg-orange-50 border-orange-500 text-orange-800"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div
        id="mapa-barrio"
        className="relative h-[65dvh] min-h-[420px] lg:h-[620px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100"
      >
        <MapView
          showManzanas={layers.manzanas}
          showIncidentes={layers.incidentes}
          showAlertas={verSos && layers.alertas}
          showOficios={layers.oficios}
          incidentes={incidentes}
          alertas={alertas}
          oficios={oficios}
          oficiosDe={oficiosDe}
          detalleLotes={detalleLotes}
          miLote={miLote}
          foco={foco}
        />
        {loading && (
          <span className="absolute top-3 right-3 z-[1000] bg-white/90 rounded-lg px-3 py-1.5 text-sm text-gray-600 shadow">
            Cargando datos…
          </span>
        )}
      </div>

      {/* Leyenda */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          Qué es cada color
        </h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-base text-gray-700">
          {miLote && (
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded bg-blue-200 border-2 border-blue-700 flex-shrink-0" />
              Tu casa (lote {miLote})
            </li>
          )}
          {layers.manzanas && (
            <>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-[3px] border-blue-600 bg-white flex-shrink-0" />
                Manzanas zona Norte
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-[3px] border-orange-600 bg-white flex-shrink-0" />
                Manzanas zona Sur
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-green-200 border-2 border-green-600 flex-shrink-0" />
                Espacios verdes
              </li>
              <li className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-200 border-2 border-violet-600 flex-shrink-0" />
                Usos comunitarios
              </li>
            </>
          )}
          {layers.incidentes && (
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-500 flex-shrink-0" />
              <span>
                Incidentes: {incidentes.length}
                {incidentesActivos > 0 && (
                  <span className="font-semibold text-orange-800">
                    {" "}
                    ({incidentesActivos} activo
                    {incidentesActivos !== 1 ? "s" : ""})
                  </span>
                )}
                <span className="text-gray-500"> · gris = resuelto</span>
              </span>
            </li>
          )}
          {layers.oficios && (
            <li className="flex items-center gap-3">
              <span className="inline-flex items-center gap-0.5 px-1.5 h-6 rounded-full bg-indigo-700 text-white text-xs font-bold flex-shrink-0">
                🧰
              </span>
              <span>
                Oficios y servicios: {oficios.length}
                <span className="text-gray-500"> · el número es cuántos hay en esa manzana</span>
              </span>
            </li>
          )}
          {verSos && layers.alertas && (
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-red-600 flex-shrink-0" />
              <span>
                Alertas SOS: {alertas.length}
                {alertasActivas.length > 0 && (
                  <span className="font-semibold text-red-700">
                    {" "}
                    ({alertasActivas.length} activa
                    {alertasActivas.length !== 1 ? "s" : ""})
                  </span>
                )}
              </span>
            </li>
          )}
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          Tocá una manzana para ver sus lotes con el número.
        </p>
      </section>

      {/* Cómo llegar a mi casa */}
      {miCasa && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🚗 Cómo llegar a tu casa
            </h2>
            <p className="text-base text-gray-700 mt-1">
              Mandale a un delivery, un remís o a tu familia un link que los
              lleva directo a la puerta de tu lote con Google Maps.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void compartirCasa()}
              className="min-h-[48px] px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-bold"
            >
              Mandar por WhatsApp
            </button>
            <button
              onClick={() => void copiarCasa()}
              className="min-h-[48px] px-5 rounded-xl bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-800 text-base font-semibold"
            >
              {copiado ? "¡Copiado!" : "Copiar mensaje"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
