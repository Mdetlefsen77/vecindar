"use client";

import { useState } from "react";
import { OPCIONES_SE_LEE, PREGUNTAS_ENCUESTA } from "@/lib/encuesta";

const BASE =
  "rounded-2xl min-h-[60px] px-4 py-3 text-lg font-bold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300";
const BOTON_PRINCIPAL = `${BASE} w-full bg-blue-600 hover:bg-blue-700 text-white`;
const BOTON_SECUNDARIO = `${BASE} w-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`;
const OPCION = `${BASE} border border-gray-200 bg-gray-50 text-gray-900 hover:bg-blue-50 hover:border-blue-300`;
const TEXTAREA =
  "w-full min-h-[120px] rounded-2xl border border-gray-300 p-3 text-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200";
const PREGUNTA = "text-xl font-bold text-gray-900";
const TARJETA =
  "rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4";

const CARITAS = ["😞", "🙁", "😐", "🙂", "😄"];

export function TarjetaEncuesta() {
  const [paso, setPaso] = useState(0);
  const [facilidad, setFacilidad] = useState<number>();
  const [seLee, setSeLee] = useState<string>();
  const [nps, setNps] = useState<number>();
  const [gusta, setGusta] = useState("");
  const [cambiaria, setCambiaria] = useState("");
  const [enviada, setEnviada] = useState(false);
  const [yaRespondida, setYaRespondida] = useState(false);
  const [error, setError] = useState(false);
  const [pospuesta, setPospuesta] = useState(false);

  async function posponer() {
    try {
      await fetch("/api/encuesta/posponer", { method: "POST" });
    } catch {
      // sin red: igual se oculta en esta pantalla
    }
    setPospuesta(true);
  }

  async function enviar() {
    const body: Record<string, unknown> = { facilidad, seLee, nps };
    if (gusta) body.gusta = gusta;
    if (cambiaria) body.cambiaria = cambiaria;
    setError(false);
    try {
      const res = await fetch("/api/encuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setEnviada(true);
      else if (res.status === 409) setYaRespondida(true);
      else setError(true);
    } catch {
      setError(true);
    }
  }

  if (pospuesta) return null;

  if (yaRespondida) {
    return (
      <section className={TARJETA}>
        <p className="text-lg font-bold text-gray-900">
          Ya respondiste esta encuesta
        </p>
      </section>
    );
  }

  if (enviada) {
    return (
      <section className={TARJETA}>
        <p className="text-lg font-bold text-gray-900">
          ¡Gracias por contarnos!
        </p>
      </section>
    );
  }

  return (
    <section className={TARJETA}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-2xl">
          📝
        </span>
        <h2 className="text-xl font-bold text-gray-900">Encuesta</h2>
      </div>
      {paso >= 1 && (
        <div>
          <p className="text-base text-gray-600">Pregunta {paso} de 5</p>
          <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${paso * 20}%` }}
            />
          </div>
        </div>
      )}
      {paso === 0 && (
        <>
          <p className={PREGUNTA}>{PREGUNTAS_ENCUESTA.intro}</p>
          <button className={BOTON_PRINCIPAL} onClick={() => setPaso(1)}>
            Responder
          </button>
          <button className={BOTON_SECUNDARIO} onClick={posponer}>
            Ahora no
          </button>
        </>
      )}
      {paso === 1 && (
        <>
          <p className={PREGUNTA}>{PREGUNTAS_ENCUESTA.facilidad}</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={`${OPCION} flex flex-col items-center justify-center min-h-[80px] px-1`}
                aria-label={`Carita ${n}`}
                onClick={() => {
                  setFacilidad(n);
                  setPaso(2);
                }}
              >
                <span aria-hidden="true" className="text-3xl">
                  {CARITAS[n - 1]}
                </span>
                <span>{n}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {paso === 2 && (
        <>
          <p className={PREGUNTA}>{PREGUNTAS_ENCUESTA.seLee}</p>
          <div className="flex flex-col gap-2">
            {OPCIONES_SE_LEE.map(([valor, etiqueta]) => (
              <button
                key={valor}
                className={`${OPCION} w-full`}
                onClick={() => {
                  setSeLee(valor);
                  setPaso(3);
                }}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </>
      )}
      {paso === 3 && (
        <>
          <p className={PREGUNTA}>{PREGUNTAS_ENCUESTA.nps}</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                className={`${OPCION} px-1`}
                onClick={() => {
                  setNps(n);
                  setPaso(4);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}
      {paso === 4 && (
        <>
          <p className={PREGUNTA}>{PREGUNTAS_ENCUESTA.gusta}</p>
          <textarea
            value={gusta}
            onChange={(e) => setGusta(e.target.value)}
            maxLength={500}
            className={TEXTAREA}
          />
          <p className="text-base text-gray-600">{gusta.length}/500</p>
          <button className={BOTON_PRINCIPAL} onClick={() => setPaso(5)}>
            Siguiente
          </button>
        </>
      )}
      {paso === 5 && (
        <>
          <p className={PREGUNTA}>{PREGUNTAS_ENCUESTA.cambiaria}</p>
          <textarea
            value={cambiaria}
            onChange={(e) => setCambiaria(e.target.value)}
            maxLength={500}
            className={TEXTAREA}
          />
          <p className="text-base text-gray-600">{cambiaria.length}/500</p>
          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-amber-50 border border-amber-300 p-3 text-lg font-bold text-amber-900"
            >
              No pudimos enviar tus respuestas. Probá de nuevo.
            </p>
          )}
          <button className={BOTON_PRINCIPAL} onClick={enviar}>
            Enviar
          </button>
        </>
      )}
      {paso >= 2 && (
        <button className={BOTON_SECUNDARIO} onClick={() => setPaso(paso - 1)}>
          Anterior
        </button>
      )}
    </section>
  );
}
