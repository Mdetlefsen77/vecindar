"use client";

import { useState } from "react";
import { AVISO_SUSCRIPCION } from "@/lib/prueba";
import { formatoPesos } from "@/lib/cobranza";
import {
  DESCUENTO_POR_INVITADO,
  DESCUENTO_VECINO_INVITADO,
  MESES_DESCUENTO,
} from "@/lib/crecimiento/beneficios";

const MENSAJE = `¡Sumate a Vecindar, la app de nuestro barrio! 🏘️ Botón de pánico, avisos, mapa y servicios de los vecinos. Si te registrás con mi link, tenés ${formatoPesos(DESCUENTO_VECINO_INVITADO)} de descuento en tus ${MESES_DESCUENTO} primeros aportes 🎁 ${AVISO_SUSCRIPCION}`;

export default function InvitarVecino({
  codigo,
  registros,
  sumados,
  cuota,
  descuento,
}: {
  codigo: string;
  /** Vecinos que se registraron con su link. */
  registros: number;
  /** De esos, los que ya pagaron su primer aporte (los que dan descuento). */
  sumados: number;
  /** Aporte mensual del vecino. null = exento: no se le muestra el precio. */
  cuota: number | null;
  /** Descuento que ya ganó, para este mes o el próximo. */
  descuento: { mes: string; monto: number } | null;
}) {
  const [copiado, setCopiado] = useState(false);

  // Se arma en el click (no en el render) porque necesita window.
  const link = () => `${window.location.origin}/i/${codigo}`;

  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Vecindar",
          text: MENSAJE,
          url: link(),
        });
      } catch {
        // el usuario canceló el share nativo — no es un error a mostrar
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${MENSAJE} ${link()}`)}`,
      "_blank",
    );
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard puede fallar sin permisos/HTTPS — el link igual queda visible
    }
  };

  // Lo que ya ganó manda; si no, el ejemplo con un vecino invitado.
  const ejemplo =
    cuota !== null ? Math.max(0, cuota - DESCUENTO_POR_INVITADO) : null;

  return (
    <section
      aria-labelledby="invitar-titulo"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-5 sm:p-6 shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
    >
      {/* Decoración */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 text-[120px] leading-none opacity-15 rotate-12"
      >
        🎁
      </span>

      <p className="inline-flex items-center gap-1.5 rounded-full bg-yellow-300 text-blue-950 px-3 py-1 text-sm font-extrabold uppercase tracking-wide">
        🎁 Beneficio para vecinos
      </p>

      <h2
        id="invitar-titulo"
        className="mt-3 text-[28px] sm:text-3xl font-extrabold leading-tight"
      >
        + compartís, + ganás
      </h2>

      {cuota !== null && descuento !== null ? (
        <div className="mt-3 rounded-2xl bg-white/15 p-4">
          <p className="text-base font-semibold text-blue-50">
            🎉 Tu aporte de {descuento.mes}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-4xl font-extrabold text-yellow-300">
              {formatoPesos(Math.max(0, cuota - descuento.monto))}
            </span>
            <span className="text-lg text-blue-100 line-through">
              {formatoPesos(cuota)}
            </span>
          </p>
        </div>
      ) : (
        ejemplo !== null &&
        cuota !== null && (
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-4xl font-extrabold text-yellow-300">
              {formatoPesos(ejemplo)}
            </span>
            <span className="text-lg text-blue-100">
              (antes <span className="line-through">{formatoPesos(cuota)}</span>
              )
            </span>
          </p>
        )
      )}

      <p className="mt-3 text-lg leading-snug text-blue-50">
        Por cada vecino que se suma, te descontamos{" "}
        <strong className="text-white whitespace-nowrap">
          {formatoPesos(DESCUENTO_POR_INVITADO)}
        </strong>{" "}
        durante {MESES_DESCUENTO} meses. Y tu vecino arranca con{" "}
        <strong className="text-white whitespace-nowrap">
          {formatoPesos(DESCUENTO_VECINO_INVITADO)}
        </strong>{" "}
        de descuento.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button
          onClick={compartir}
          className="min-h-[56px] flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[0.98] transition-all text-white text-lg font-extrabold shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-200"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="w-6 h-6 fill-current"
          >
            <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.23-9.42 9.43-9.42a9.37 9.37 0 0 1 6.66 2.76 9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.42-9.43 9.42m8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.64-1.48a11.3 11.3 0 0 0 5.79 1.47h.01c6.24 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.32-8" />
          </svg>
          Invitar por WhatsApp
        </button>
        <button
          onClick={copiarLink}
          className="min-h-[56px] sm:w-48 rounded-2xl bg-white/15 hover:bg-white/25 border-2 border-white/40 text-white text-base font-bold transition-colors"
        >
          {copiado ? "✓ ¡Link copiado!" : "Copiar mi link"}
        </button>
      </div>

      {registros > 0 ? (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-base font-semibold text-blue-50">
          <span>
            👥 Invitaste a {registros} vecino{registros === 1 ? "" : "s"}
          </span>
          <span>
            ✅ {sumados} ya se sum{sumados === 1 ? "ó" : "aron"}
          </span>
        </p>
      ) : (
        <p className="mt-4 text-sm text-blue-100">
          El descuento se aplica cuando tu vecino paga su primer aporte.
        </p>
      )}
    </section>
  );
}
