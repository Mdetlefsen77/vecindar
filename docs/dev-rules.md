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

**Patrón en API Routes:** usar los helpers de `@/lib/api/guard`
(`requireSession`, `requireRole`, `requireRoleSession`, `getUserId`):

```ts
const guard = await requireRoleSession(GESTORES_USUARIOS);
if (guard.response) return guard.response;
const { session } = guard;
```

**Regla:** nunca confiar en el cliente para ocultar rutas. El guard siempre va en el servidor.

### Matriz de roles — `@/lib/permisos.ts`

Los conjuntos de roles que pueden gestionar cada módulo viven en un solo lugar
(`GESTORES_INCIDENTES`, `GESTORES_REQUERIMIENTOS`, `GESTORES_MASCOTAS`,
`GESTORES_PANICO`, `GESTORES_USUARIOS`). Chequear con `esGestor(rol, CONJUNTO)`.
No repetir `role === "ADMIN" || role === "SEGURIDAD"` inline.

### Proxy (edge) — `src/proxy.ts`

Primera barrera de auth antes de renderizar: verifica la firma del JWT de sesión
con `getToken` y redirige a `/login` las rutas protegidas sin token. Es defensa
en profundidad — la verificación de rol y datos finos sigue en cada Server
Component / route handler. Convención de Next 16: el archivo se llama `proxy.ts`
(antes `middleware.ts`) y exporta `proxy` + `config.matcher`.

---

## Pendientes / Backlog

### ✅ Filtros del mapa (`/mapa`) — IMPLEMENTADO

Los botones "Manzanas", "Incidentes" y "Alertas SOS" están conectados a los layers del mapa. Cada botón toglea su layer; "Ver Todo" activa todos.

- Fetch client-side desde `/api/incidentes` y `/api/panico` al montar la página.
- `AlertasLayer.tsx` renderiza pines 🆘 con animación de pulso para alertas activas.
- Badge rojo en el botón "Alertas SOS" muestra el conteo de alertas activas.
- La leyenda dinámica refleja solo los layers activos con conteo en tiempo real.

### Notificaciones push para Pánico SOS — IMPLEMENTADO

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

### ✅ Soporte de fotos / adjuntos (incidentes, mascotas, requerimientos) — IMPLEMENTADO

Implementado en marzo 2026. Los usuarios pueden subir fotos desde galería o cámara en los tres módulos.

Objetivos:

- Permitir adjuntar 1..N imágenes cuando se crea un `Incidente`, una `MascotaPerdida` o un `Requerimiento`.
- Almacenar URLs en el registro correspondiente (por ejemplo, `incidentes.imagenes: String[]`, `requerimientos.imagenes: String[]`, `mascotas_perdidas.foto`).
- Soportar carga desde móvil (input file), preview en el formulario y envío multipart/form-data o subida previa a un storage (S3 / Cloudinary) con retorno de URL.

Requisitos técnicos (sugeridos):

- Frontend: componente de upload reutilizable con preview y compresión opcional (client-side).
- API: endpoint que acepte `multipart/form-data` y guarde archivos en storage seguro; o endpoints para recibir URL tras subir a un servicio externo.
- Security: validar tipo (`image/*`), tamaño máximo (por ejemplo 5MB por imagen) y sanitizar nombres/paths.
- Storage: usar S3/MinIO/Cloudinary con políticas de acceso privadas; generar URLs temporales si es necesario.
- Prisma: guardar las URLs en los arrays `imagenes` o campo `foto` según el modelo (modificar `schema.prisma` cuando se implemente).

Ejemplos de uso (backlog):

- Requerimiento: "Foto de calle en mal estado" → Usuario sube foto mostrando el bache/rotura, se guarda en `requerimientos.imagenes` y se muestra en la ficha.
- Mascotas: "Foto de la mascota perdida" → Usuario sube foto para identificarla rápidamente; aparece en listados y detalles.
- Incidentes: "Foto del sospechoso" → Permitir adjuntar evidencia visual que ayude en la investigación.

Notas operativas:

- Guardar metadatos opcionales (mimetype, tamaño, nombre original, timestamp) para auditoría.
- Considerar generación de thumbnails y limitación de resolución para mejorar performance móvil.
- Revisar requisitos legales sobre almacenamiento de imágenes y privacidad antes de activar public access.

---

### Backlog: SLA y prioridades para incidentes y requerimientos - IMPLEMENTADO

Implementar un sistema de niveles de prioridad con tiempos de respuesta (SLA) configurables por el admin, de modo que cada incidente y requerimiento tenga un nivel de urgencia visible y un indicador de cumplimiento del tiempo acordado.

#### Niveles de prioridad propuestos

| Nivel     | Color sugerido | SLA por defecto | Descripción                                            |
| --------- | -------------- | --------------- | ------------------------------------------------------ |
| `CRITICO` | Rojo           | 2 hs            | Riesgo inmediato para la seguridad o integridad física |
| `ALTO`    | Naranja        | 8 hs            | Afecta a múltiples vecinos o requiere acción urgente   |
| `MEDIO`   | Amarillo       | 48 hs           | Problema concreto sin riesgo inmediato                 |
| `BAJO`    | Verde / gris   | 7 días          | Mejora o reclamo menor, puede planificarse             |

#### Objetivos

- Agregar campo `prioridad` a los modelos `Incidente` y `Requerimiento` en `schema.prisma` (enum `Prioridad`).
- Permitir al admin definir o editar los tiempos de SLA por nivel desde un panel de configuración (tabla `ConfigSLA` en la base de datos).
- Calcular y exponer en la UI si cada ítem está **En plazo**, **Por vencer** (≤ 20% del tiempo restante) o **Vencido** en función de `createdAt` + SLA del nivel.
- Mostrar badge de prioridad y estado SLA en los listados de incidentes y requerimientos.
- Permitir que el admin asigne o cambie la prioridad desde el panel de detalle.

#### Esquema Prisma sugerido

```prisma
enum Prioridad {
  CRITICO
  ALTO
  MEDIO
  BAJO
}

model ConfigSLA {
  id          Int       @id @default(autoincrement())
  prioridad   Prioridad @unique
  horasLimite Int       // horas hasta vencimiento
  updatedAt   DateTime  @updatedAt

  @@map("config_sla")
}
```

Agregar en `Incidente` y `Requerimiento`:

```prisma
prioridad  Prioridad @default(MEDIO)
```

#### Requisitos técnicos

- `GET /api/config/sla` — devuelve los 4 niveles con sus horas actuales (solo admin puede editar).
- `PATCH /api/config/sla` — permite al admin actualizar las horas de cada nivel.
- Helper `calcularEstadoSLA(createdAt, prioridad, config): "EN_PLAZO" | "POR_VENCER" | "VENCIDO"` — reutilizable en server components y API routes.
- El campo `prioridad` debe poderse establecer al crear y editar un incidente o requerimiento.
- En la vista de listado: columna o badge con color + estado SLA.
- En la vista de detalle: indicador visual claro del tiempo restante o vencimiento.

#### Consideraciones adicionales

- **Notificaciones por vencimiento:** tarea cron (o trigger en cada render del panel admin) para alertar cuando un ítem está próximo a vencer o ya venció. Integra con el backlog de notificaciones push.
- **Histórico de prioridad:** considerar guardar registros de cambios de prioridad (`PrioridadLog`) para auditoría.
- **Prioridad automática sugerida:** en el futuro, inferir la prioridad inicial según el tipo (`ROBO` → CRITICO por defecto, `ILUMINACION` → BAJO) para reducir carga operativa del admin.
- **Dashboard de SLA:** sección en el panel admin con métricas: porcentaje de ítems resueltos en plazo por nivel, tiempo promedio de resolución, cantidad vencidos por semana.
