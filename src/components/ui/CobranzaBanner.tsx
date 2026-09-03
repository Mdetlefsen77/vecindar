"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Aviso global para el vecino cuya cuota está vencida. Se monta en el layout
 * del dashboard y aparece arriba del contenido en todas las páginas (menos la
 * de detalle, donde ya está toda la info). "Recordar más tarde" lo oculta
 * hasta que se recargue la app; el botón de pánico nunca se ve afectado.
 */
export default function CobranzaBanner({
  meses,
  deuda,
}: {
  meses: number;
  deuda: string;
}) {
  const pathname = usePathname();
  const [cerrado, setCerrado] = useState(false);

  if (cerrado || pathname === "/mi-suscripcion") return null;

  return (
    <div
      role="alert"
      className="mx-3 mt-3 sm:mx-4 sm:mt-4 md:mx-6 md:mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          ⚠️
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Tu cuota está vencida
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {meses === 1 ? "Adeudás 1 mes" : `Adeudás ${meses} meses`} · total
            estimado {deuda}.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/mi-suscripcion"
              className="min-h-[36px] inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
            >
              Ver cómo pagar
            </Link>
            <button
              onClick={() => setCerrado(true)}
              className="min-h-[36px] px-3 py-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors"
            >
              Recordar más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
