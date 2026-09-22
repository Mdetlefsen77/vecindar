"use client";

import { useEffect, useState } from "react";

const MENSAJE =
  "Te invito a sumarte a Vecindar, la app de seguridad y gestión de nuestro barrio 🏘️";

export default function InvitarVecino() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [registros, setRegistros] = useState(0);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/invitaciones/mi-codigo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setCodigo(data.codigo);
        setRegistros(data.registros ?? 0);
      })
      .catch(() => {});
  }, []);

  if (!codigo) return null;

  const link = `${window.location.origin}/i/${codigo}`;

  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vecindar", text: MENSAJE, url: link });
      } catch {
        // el usuario canceló el share nativo — no es un error a mostrar
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${MENSAJE} ${link}`)}`,
      "_blank",
    );
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard puede fallar sin permisos/HTTPS — el link igual queda visible
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-bold text-gray-900 text-base sm:text-lg">
          Invitá a un vecino
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {registros > 0
            ? `Gracias a vos, ${registros} vecino${registros === 1 ? "" : "s"} se sumó${registros === 1 ? "" : "ron"} a Vecindar.`
            : "Compartí tu link y sumá a tu barrio a la app."}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        <button
          onClick={copiarLink}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {copiado ? "¡Copiado!" : "Copiar link"}
        </button>
        <button
          onClick={compartir}
          className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Compartir
        </button>
      </div>
    </section>
  );
}
