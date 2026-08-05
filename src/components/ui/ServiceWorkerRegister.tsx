"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker apenas carga el sitio (no solo al activar
 * push), para que el navegador pueda ofrecer instalar Vecindar como PWA.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
