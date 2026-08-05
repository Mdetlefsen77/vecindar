"use client";

import { usePushNotifications } from "@/lib/push/usePushNotifications";

/**
 * Botón que permite activar o desactivar las notificaciones push
 * (SOS, incidentes, respuestas a requerimientos, mascotas) en este dispositivo.
 */
export default function PushNotificationToggle() {
  const { state, subscribe, unsubscribe, error } = usePushNotifications();

  if (state === "unsupported") return null;

  if (state === "denied") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs">
        <span>🔕</span>
        <span>Notificaciones bloqueadas por el navegador</span>
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium transition-colors"
        title="Notificaciones activas — click para desactivar"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Notificaciones activas
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs">
        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Activando…
      </div>
    );
  }

  // idle
  return (
    <div>
      <button
        onClick={subscribe}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium transition-colors"
        title="Activar notificaciones push en este dispositivo"
      >
        <span>🔔</span>
        Activar notificaciones
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-red-600">
          No se pudo activar: {error}
        </p>
      )}
    </div>
  );
}
