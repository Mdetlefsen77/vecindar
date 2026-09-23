"use client";

import { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { DATOS_PAGO } from "@/lib/cobranza";

const DATOS = [
  { label: "Alias", valor: DATOS_PAGO.alias },
  { label: "CBU/CVU", valor: DATOS_PAGO.cbu },
  { label: "Titular", valor: DATOS_PAGO.titular },
].filter((d) => d.valor);

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sin permisos o sin HTTPS: fallback con un textarea temporal.
    try {
      const el = document.createElement("textarea");
      el.value = texto;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function FilaCopiable({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!(await copiarAlPortapapeles(valor))) return;
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className="flex items-center gap-1 min-w-0">
        <span className="text-sm font-semibold text-gray-900 text-right break-all">
          {valor}
        </span>
        <button
          type="button"
          onClick={copiar}
          aria-label={copiado ? `${label} copiado` : `Copiar ${label}`}
          title={copiado ? "¡Copiado!" : "Copiar"}
          className={`shrink-0 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            copiado
              ? "text-green-600 bg-green-50"
              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          {copiado ? (
            <CheckIcon className="w-5 h-5" aria-hidden />
          ) : (
            <DocumentDuplicateIcon className="w-5 h-5" aria-hidden />
          )}
        </button>
      </dd>
      <span className="sr-only" aria-live="polite">
        {copiado ? `${label} copiado al portapapeles` : ""}
      </span>
    </div>
  );
}

/**
 * Cómo pagar la cuota: botón al link de Mercado Pago + datos de
 * transferencia con botón de copiar cada uno (para pegarlos en la app del
 * banco o de Mercado Pago). Se usa en /mi-suscripcion y /prueba-finalizada.
 */
export default function DatosPago() {
  if (!DATOS_PAGO.linkMercadoPago && DATOS.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-500">
        Los datos de pago todavía no están cargados. Consultá con el
        administrador del barrio.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {DATOS_PAGO.linkMercadoPago && (
        <a
          href={DATOS_PAGO.linkMercadoPago}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#009EE3] hover:bg-[#0089c7] px-4 py-3 text-base font-bold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009EE3] focus-visible:ring-offset-2"
        >
          Pagá con Mercado Pago
          <ArrowTopRightOnSquareIcon className="w-5 h-5" aria-hidden />
        </a>
      )}

      {DATOS_PAGO.linkMercadoPago && DATOS.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />o por transferencia
          <span className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {DATOS.length > 0 && (
        <dl className="divide-y divide-gray-100">
          {DATOS.map((d) => (
            <FilaCopiable key={d.label} label={d.label} valor={d.valor} />
          ))}
        </dl>
      )}

      {DATOS_PAGO.nota && (
        <p className="text-sm text-gray-600">{DATOS_PAGO.nota}</p>
      )}
    </div>
  );
}
