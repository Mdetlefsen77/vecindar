# Reglas de desarrollo — Vecindar

Patrones y errores comunes a recordar durante el desarrollo del proyecto.

---

## Next.js App Router

### `dynamic()` con `ssr: false` solo en Client Components

`dynamic()` con `ssr: false` **no puede usarse en Server Components**. Si la página es un Server Component (async function sin `"use client"`), se debe crear un wrapper cliente intermedio.

**Patrón correcto:**

```tsx
// MiComponenteLazy.tsx  ← "use client"
"use client";
import dynamic from "next/dynamic";

const MiComponente = dynamic(() => import("./MiComponente"), { ssr: false });
export default MiComponente;
```

```tsx
// page.tsx  ← Server Component
import MiComponenteLazy from "./MiComponenteLazy";

export default async function Page() {
  return <MiComponenteLazy />;
}
```

**Aplica especialmente a:** componentes con Leaflet, librerías que acceden a `window`/`document`, WebSockets, etc.

**Archivos del proyecto donde se aplicó:**
- `app/(dashboard)/incidentes/IncidentesMapaLazy.tsx`
- `app/(dashboard)/incidentes/[id]/DetalleMapaMiniLazy.tsx`

---

## Seguridad / Autorización

### Guard de rol en Server Components y API Routes

Cada página de admin y cada API route restringida debe verificar sesión y rol **al inicio**, antes de cualquier consulta a la base de datos. Redireccionar desde el servidor evita exponer datos en el cliente.

**Patrón en páginas (Server Component):**

```tsx
const session = await auth();
if (!session?.user) redirect("/login");
if (session.user.role !== "ADMIN") redirect("/");
```

**Patrón en API Routes:**

```ts
const session = await auth();
if (!session?.user || session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
}
```

**Regla:** nunca confiar en el cliente para ocultar rutas. El guard siempre va en el servidor.

---

## Pendientes / Backlog

### Filtros del mapa (`/mapa`) — pendiente catastral
Los botones "Manzanas", "Incidentes" y "Alertas SOS" en la página del mapa están visualmente presentes pero sin conectar a los layers del mapa. Se activan cuando llegue el GeoJSON catastral del contacto en Catastro provincial.
- "Manzanas" e "Incidentes" tienen layers ya construidos (`ManzanasLayer`, `IncidentesLayer`).
- "Alertas SOS" en el mapa se construye después del catastral.

### Notificaciones push para Pánico SOS
Cuando un vecino activa el botón SOS, el ideal es que admin/seguridad reciban una **notificación push nativa** (funciona con app cerrada en móvil).

**Stack necesario:**
- `web-push` npm package
- Generar VAPID keys: `npx web-push generate-vapid-keys`
- Guardar `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en `.env`
- Modelo en Prisma para guardar suscripciones: `PushSubscription { id, usuarioId, endpoint, p256dh, auth }`
- `POST /api/push/subscribe` — guarda la suscripción del admin al cargar el panel
- En `POST /api/panico` — después de crear la alerta, buscar todas las suscripciones de ADMIN/SEGURIDAD y enviar push con `webpush.sendNotification()`
- Service Worker en `public/sw.js` para recibir el `push` event y mostrar la notificación

**Flujo:** Admin abre panel → navegador pide permiso de notificaciones → suscripción se guarda → vecino aprieta SOS → servidor envía push → admin recibe notificación aunque tenga el teléfono guardado.

---
