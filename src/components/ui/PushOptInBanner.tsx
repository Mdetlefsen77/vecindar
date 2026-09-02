"use client";

import { useSyncExternalStore } from "react";
import { usePushNotifications } from "@/lib/push/usePushNotifications";

const DISMISSED_KEY = "vecindar-push-optin-dismissed";
const INSTALL_DISMISSED_KEY = "vecindar-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Nos suscribimos al evento "storage" para poder ocultar el banner al instante
// cuando el usuario toca "Ahora no" (el setItem no dispara storage en la misma
// pestaña, así que lo emitimos a mano en dismiss()).
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
function getServerSnapshotFalse() {
  return false;
}

/**
 * Banner proactivo que aparece tras el login pidiendo activar las notificaciones
 * push. Antes el único punto de opt-in era un botón escondido en el menú, así
 * que la mayoría de los vecinos nunca las activaba y no se enteraba de nada
 * (alertas SOS, incidentes, requerimientos y mascotas nuevas).
 */
export default function PushOptInBanner() {
  const { state, subscribe, error } = usePushNotifications();

  // `oculto` = ya lo descartó, o todavía no instaló la PWA y no descartó el
  // banner de instalación. En ese caso dejamos que InstallPrompt vaya primero
  // (misma posición fija) y este aparece recién después: instalar → activar.
  const oculto = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === "1") return true;
        if (
          !isStandalone() &&
          localStorage.getItem(INSTALL_DISMISSED_KEY) !== "1"
        ) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    getServerSnapshotFalse,
  );

  // Sólo cuando se puede activar y todavía no está activo ni bloqueado.
  if (oculto || (state !== "idle" && state !== "loading")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* modo incógnito / storage bloqueado — igual ocultamos vía re-render */
    }
    // setItem no dispara "storage" en la propia pestaña — lo emitimos a mano
    // para que useSyncExternalStore relea y el banner desaparezca al instante.
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+12px)] md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg" aria-hidden>
            🔔
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Activá las notificaciones
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Enterate al instante de alertas SOS, incidentes, requerimientos y
            mascotas perdidas en el barrio.
          </p>
          {error && (
            <p className="mt-1.5 text-xs text-red-600">
              No se pudo activar: {error}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={subscribe}
              disabled={state === "loading"}
              className="min-h-[36px] px-3 py-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {state === "loading" ? "Activando…" : "Activar"}
            </button>
            <button
              onClick={dismiss}
              className="min-h-[36px] px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
