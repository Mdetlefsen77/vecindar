// Service Worker — Vecindar Push Notifications
// Maneja eventos push y clicks de notificaciones

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title ?? "🆘 Alerta SOS — Vecindar";
  const options = {
    body: data.body ?? "Nueva alerta de pánico en el barrio.",
    icon: "/images/icon-192.png",
    badge: "/images/icon-72.png",
    data: { url: data.url ?? "/panico" },
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag ?? "sos-alert",
    renotify: true,
    actions: [
      { action: "ver", title: "Ver panel" },
      { action: "dismiss", title: "Cerrar" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/panico";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta con la URL, enfocarla
        for (const client of clientList) {
          if (client.url.includes("/panico") && "focus" in client) {
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
