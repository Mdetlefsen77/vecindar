"use client";

import { useEffect, useState } from "react";

interface Props {
  anio: number;
  imagenUrl: string;
}

// Botón de compartir + tarjeta personalizada de referidos (solo si hay sesión
// y el usuario invitó a alguien) — docs/proposal-crecimiento.md §1 y §4.
// El resto de la página es igual para cualquiera (nivel DIFUSION); esto es lo
// único que varía por viewer, y no forma parte de la imagen que se comparte.
export default function WrappedAcciones({ anio, imagenUrl }: Props) {
  const [registros, setRegistros] = useState(0);

  useEffect(() => {
    fetch("/api/invitaciones/mi-codigo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRegistros(data.registros ?? 0))
      .catch(() => {});
  }, []);

  const compartir = async () => {
    const url = `${window.location.origin}/wrapped/${anio}`;
    const texto = `Así estuvo nuestro barrio en ${anio} según Vecindar 👇`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vecindar Wrapped", text: texto, url });
      } catch {
        // cancelado por el usuario, no es un error
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-4">
      {registros > 0 && (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <p className="text-sm text-slate-200">
            Gracias a vos, {registros} vecino{registros === 1 ? "" : "s"} se
            sumó{registros === 1 ? "" : "ron"} a Vecindar.
          </p>
        </div>
      )}
      <button
        onClick={compartir}
        className="w-full py-3 rounded-xl bg-brand hover:bg-brand-dark font-semibold transition-colors"
      >
        Compartir
      </button>
      {/* La imagen 1080×1350 pensada para compartir como tarjeta */}
      <a
        href={imagenUrl}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        Ver como imagen
      </a>
    </div>
  );
}
