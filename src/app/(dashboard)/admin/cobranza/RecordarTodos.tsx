"use client";

import { useState } from "react";

/** Envía ya mismo el push de recordatorio a todos los deudores con push activo. */
export default function RecordarTodos({ conPush }: { conPush: number }) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">(
    "idle",
  );
  const [mensaje, setMensaje] = useState("");

  async function enviar() {
    if (
      !confirm(
        `¿Mandar ahora un recordatorio push a ${conPush} vecinos con la cuota vencida o sin pagos?`,
      )
    )
      return;
    setEstado("enviando");
    try {
      const res = await fetch("/api/cobranza/recordatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo enviar.");
      setEstado("ok");
      setMensaje(`Recordatorio enviado a ${d.enviados} vecinos.`);
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "Error inesperado.");
    }
  }

  if (estado === "ok" || estado === "error") {
    return (
      <p
        role="status"
        className={`text-sm font-medium ${estado === "ok" ? "text-green-700" : "text-red-600"}`}
      >
        {mensaje}
      </p>
    );
  }

  return (
    <button
      onClick={enviar}
      disabled={conPush === 0 || estado === "enviando"}
      className="text-sm px-3 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60 transition-colors whitespace-nowrap"
    >
      {estado === "enviando" ? "Enviando…" : "Recordar a todos por push"}
    </button>
  );
}
