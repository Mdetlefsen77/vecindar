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

  event.waitUntil(self.registration.showNotification(title, options));
});

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
