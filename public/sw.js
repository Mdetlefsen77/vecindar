// Service Worker — Vecindar
// Necesario para que el sitio sea instalable como PWA (Android/Chrome) y
// para recibir Web Push. Maneja eventos push, clicks de notificaciones y
// deja pasar los fetch sin cachear (sin soporte offline por ahora).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title ?? "Vecindar";
  const url = data.url ?? "/inicio";
  const options = {
    body: data.body ?? "Tenés una notificación nueva.",
    icon: "/images/icon-192.png",
    badge: "/images/icon-72.png",
    data: { url },
    requireInteraction: !!data.requireInteraction,
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag ?? "vecindar-alert",
    renotify: true,
    actions: [
      { action: "ver", title: "Ver" },
      { action: "dismiss", title: "Cerrar" },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Avisarle a las pestañas ya abiertas (el push llega igual aunque la
      // app esté en primer plano) — la pestaña decide si amerita la alarma
      // sonora (ver SosAlertListener), acá solo se reenvía el payload tal cual.
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({ type: "PUSH_RECIBIDO", payload: data });
          }
        }),
    ]),
  );
});

// Algunos navegadores (Chrome/FCM sobre todo) rotan o expiran el endpoint de
// push cada tanto. Cuando pasa, hay que re-suscribir con la misma VAPID key y
// reenviar la suscripción al server; si no, el dispositivo queda sin
// notificaciones hasta que el usuario vuelve a tocar el toggle a mano.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/push/vapid-public-key");
        const { publicKey } = await res.json();
        const nuevaSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevaSub.toJSON()),
        });
      } catch (err) {
        // best-effort: si falla (ej: sin sesión válida), el usuario tendrá
        // que re-activar las notificaciones desde el menú.
        console.error("pushsubscriptionchange: no se pudo re-suscribir", err);
      }
    })(),
  );
});

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = self.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/inicio";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta con esa URL, enfocarla
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Si no, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});
