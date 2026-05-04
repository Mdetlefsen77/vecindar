"use client";

import { usePushNotifications } from "@/lib/push/usePushNotifications";

/**
 * Botón que permite a admin/seguridad activar o desactivar
 * las notificaciones push de alertas SOS en este dispositivo.
 */
export default function PushNotificationToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications();

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
        title="Notificaciones SOS activas — click para desactivar"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Push activo — desactivar
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
    <button
      onClick={subscribe}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-medium transition-colors"
      title="Activar notificaciones push para alertas SOS"
    >
      <span>🔔</span>
      Activar notificaciones SOS
    </button>
  );
}
