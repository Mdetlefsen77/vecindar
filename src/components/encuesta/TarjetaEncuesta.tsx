"use client";

import { useState } from "react";
import { OPCIONES_SE_LEE, PREGUNTAS_ENCUESTA } from "@/lib/encuesta";

const BOTON =
  "rounded-2xl border border-gray-300 bg-white px-4 py-3 min-h-[60px] text-lg font-bold";

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

  if (yaRespondida) {
    return <p className="text-lg font-bold">Ya respondiste esta encuesta</p>;
  }

  if (enviada) {
    return <p className="text-lg font-bold">¡Gracias por contarnos!</p>;
  }

  return (
    <section className="rounded-2xl border border-gray-300 bg-white px-4 py-3">
      {paso === 0 && (
        <>
          <p className="text-lg font-bold">{PREGUNTAS_ENCUESTA.intro}</p>
          <button className={BOTON} onClick={() => setPaso(1)}>
            Responder
          </button>
        </>
      )}
      {paso === 1 && (
        <>
          <p className="text-lg font-bold">{PREGUNTAS_ENCUESTA.facilidad}</p>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`${BOTON} flex flex-col items-center`}
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
        </>
      )}
      {paso === 2 && (
        <>
          <p className="text-lg font-bold">{PREGUNTAS_ENCUESTA.seLee}</p>
          {OPCIONES_SE_LEE.map(([valor, etiqueta]) => (
            <button
              key={valor}
              className={BOTON}
              onClick={() => {
                setSeLee(valor);
                setPaso(3);
              }}
            >
              {etiqueta}
            </button>
          ))}
        </>
      )}
      {paso === 3 && (
        <>
          <p className="text-lg font-bold">{PREGUNTAS_ENCUESTA.nps}</p>
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              className={BOTON}
              onClick={() => {
                setNps(n);
                setPaso(4);
              }}
            >
              {n}
            </button>
          ))}
        </>
      )}
      {paso === 4 && (
        <>
          <p className="text-lg font-bold">{PREGUNTAS_ENCUESTA.gusta}</p>
          <textarea
            value={gusta}
            onChange={(e) => setGusta(e.target.value)}
            maxLength={500}
            className="w-full rounded-2xl border border-gray-300 p-3 text-lg"
          />
          <p className="text-base text-gray-600">{gusta.length}/500</p>
          <button className={BOTON} onClick={() => setPaso(5)}>
            Siguiente
          </button>
        </>
      )}
      {paso === 5 && (
        <>
          <p className="text-lg font-bold">{PREGUNTAS_ENCUESTA.cambiaria}</p>
          <textarea
            value={cambiaria}
            onChange={(e) => setCambiaria(e.target.value)}
            maxLength={500}
            className="w-full rounded-2xl border border-gray-300 p-3 text-lg"
          />
          <p className="text-base text-gray-600">{cambiaria.length}/500</p>
          {error && (
            <p role="alert" className="text-lg font-bold">
              No pudimos enviar tus respuestas. Probá de nuevo.
            </p>
          )}
          <button className={BOTON} onClick={enviar}>
            Enviar
          </button>
        </>
      )}
      {paso >= 2 && (
        <button className={BOTON} onClick={() => setPaso(paso - 1)}>
          Anterior
        </button>
      )}
    </section>
  );
}
