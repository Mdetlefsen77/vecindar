"use client";

import { useState } from "react";

const BOTON =
  "rounded-2xl border border-gray-300 bg-white px-4 py-3 min-h-[60px] text-lg font-bold";

export function TarjetaEncuesta() {
  const [paso, setPaso] = useState(0);
  const [facilidad, setFacilidad] = useState<number>();
  const [seLee, setSeLee] = useState<string>();
  const [nps, setNps] = useState<number>();
  const [gusta, setGusta] = useState("");
  const [cambiaria, setCambiaria] = useState("");
  const [enviada, setEnviada] = useState(false);

  async function enviar() {
    const body: Record<string, unknown> = { facilidad, seLee, nps };
    if (gusta) body.gusta = gusta;
    if (cambiaria) body.cambiaria = cambiaria;
    const res = await fetch("/api/encuesta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setEnviada(true);
  }

  if (enviada) {
    return <p className="text-lg font-bold">¡Gracias por contarnos!</p>;
  }

  return (
    <section className="rounded-2xl border border-gray-300 bg-white px-4 py-3">
      {paso === 0 && (
        <>
          <p className="text-lg font-bold">
            ¿Nos contás cómo te va con la app? Son 5 preguntas
          </p>
          <button className={BOTON} onClick={() => setPaso(1)}>
            Responder
          </button>
        </>
      )}
      {paso === 1 && (
        <>
          <p className="text-lg font-bold">
            ¿Qué tan fácil te resulta usar la app?
          </p>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={BOTON}
              aria-label={`Carita ${n}`}
              onClick={() => {
                setFacilidad(n);
                setPaso(2);
              }}
            >
              {n}
            </button>
          ))}
        </>
      )}
      {paso === 2 && (
        <>
          <p className="text-lg font-bold">
            ¿Se leen bien los textos y botones?
          </p>
          <button
            className={BOTON}
            onClick={() => {
              setSeLee("SI");
              setPaso(3);
            }}
          >
            Sí
          </button>
        </>
      )}
      {paso === 3 && (
        <>
          <p className="text-lg font-bold">
            Del 0 al 10, ¿cuánto se la recomendarías a un vecino?
          </p>
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
          <p className="text-lg font-bold">¿Qué es lo que más te gusta?</p>
          <textarea
            value={gusta}
            onChange={(e) => setGusta(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 p-3 text-lg"
          />
          <button className={BOTON} onClick={() => setPaso(5)}>
            Siguiente
          </button>
        </>
      )}
      {paso === 5 && (
        <>
          <p className="text-lg font-bold">
            Si pudieras cambiar o agregar una sola cosa, ¿cuál sería?
          </p>
          <textarea
            value={cambiaria}
            onChange={(e) => setCambiaria(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 p-3 text-lg"
          />
          <button className={BOTON} onClick={enviar}>
            Enviar
          </button>
        </>
      )}
    </section>
  );
}
