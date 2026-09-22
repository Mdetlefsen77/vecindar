# Vecindar — Contexto del proyecto

> Documento de contexto para pegar en un chat nuevo (Claude web u otro) que no conoce el proyecto. Describe qué es Vecindar, qué problema resuelve, el stack, la arquitectura, el modelo de datos, los roles/permisos y el historial de features implementadas. Generado el 2026-09-21 a partir del estado real del repo en `main` (commit `1444442`).

---

## 1. Qué es Vecindar

**Vecindar** es una aplicación web (PWA instalable) de **gestión comunitaria para un barrio privado/cerrado**, pensada para un solo barrio (no es multi-tenant). Reemplaza el grupo de WhatsApp / cadena de mails que suelen usar estos barrios para tres cosas: seguridad, mantenimiento y administración de la cuota.

Slogan interno: *"Tu barrio conectado"*.

### Problema que resuelve

- No hay forma centralizada de reportar incidentes de seguridad (robos, sospechosos) ni de ver dónde se concentran.
- No hay un botón de emergencia real (SOS) que avise a seguridad/admin con ubicación.
- Los reclamos de mantenimiento (iluminación, poda, calles) se pierden en chats grupales, sin seguimiento de estado.
- Los avisos de mascotas perdidas son informales y efímeros.
- La cobranza de la cuota mensual del barrio se lleva a mano (Excel/WhatsApp), sin visibilidad de quién debe ni aviso automático a los morosos.

### A quién sirve (roles)

Un usuario pertenece a un **lote** (hasta 2 cuentas por lote, ej. madre y padre) y tiene uno de estos roles (`enum Rol` en Prisma):

| Rol | Para qué |
|---|---|
| `VECINO` | Residente común: reporta, ve, usa el SOS, paga su cuota |
| `REFERENTE_MANZANA` | Vecino con permisos extra: gestiona requerimientos y mascotas de su zona |
| `SEGURIDAD` | Guardia/vigilancia: gestiona incidentes y alertas de pánico |
| `TESORERO` | Gestiona cobranza (panel `/admin/cobranza`) sin ser admin completo |
| `ADMIN` | Control total: usuarios, verificación de altas, configuración, todos los paneles |

La matriz de qué rol gestiona qué módulo vive centralizada en `src/lib/permisos.ts` (`GESTORES_INCIDENTES`, `GESTORES_REQUERIMIENTOS`, `GESTORES_MASCOTAS`, `GESTORES_PANICO`, `GESTORES_USUARIOS`, `GESTORES_COBRANZA`) y se chequea con `esGestor(rol, CONJUNTO)`. Nunca se repite el check inline.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 |
| Backend | Next.js API Routes (`src/app/api/**`) |
| Base de datos | PostgreSQL |
| ORM | **Prisma 7** (`prisma-client` generator, cliente generado en `src/generated/`, **no** el paquete `@prisma/client` tradicional), adapter `@prisma/adapter-pg` (driver `pg` directo) |
| Auth | **NextAuth.js v5 (beta)**, provider Credentials (email + password con `bcryptjs`), sesión JWT de 90 días |
| Mapas | Leaflet + react-leaflet + OpenStreetMap (sin API keys de pago) |
| Notificaciones | Web Push nativo (`web-push`, VAPID keys) + Service Worker propio (`public/sw.js`) |
| Storage de imágenes | Supabase Storage (`@supabase/supabase-js`) — subida desde `POST /api/uploads` |
| Formularios | `react-hook-form` + `@hookform/resolvers` + **Zod** (validación compartida cliente/servidor en `src/lib/validation/*`) |
| PWA | `public/manifest.json` + Service Worker + `InstallPrompt.tsx` (instalable en Android/iOS/desktop) |
| Hosting | Vercel (deploy + Vercel Cron para tareas programadas) |
| Otros deps | `date-fns` (fechas), `@headlessui/react` + `@heroicons/react` (UI) |

### Por qué estas elecciones (contexto de decisiones)

- **Prisma 7 con el nuevo generator `prisma-client`** (no `prisma-client-js` clásico): el cliente se genera como TS plano en `src/generated/`, importado como `@/generated/*`. Ojo si se pide ayuda de Prisma en otro chat: los imports y tipos difieren del Prisma clásico.
- **NextAuth v5 beta**: API de `auth()` server-side (no `getServerSession`).
- **Sin motor de pagos de terceros pesado**: la integración de MercadoPago (ver más abajo) usa **REST directo, sin el SDK oficial** de MercadoPago.
- **Sin Firebase**: las push notifications son Web Push estándar (VAPID), no FCM.
- **Next 16 renombró `middleware.ts` → `proxy.ts`**: la primera barrera de auth (verifica JWT con `getToken` antes de renderizar rutas protegidas) vive en `src/proxy.ts`.

---

## 3. Arquitectura y estructura de carpetas

```
src/
  app/
    (auth)/login, /registro          — páginas públicas de auth
    (dashboard)/                     — todo lo autenticado, con Sidebar/BottomNav/MobileHeader
      inicio/                        — home del vecino (accesos + badges de "nuevo")
      mapa/                          — mapa general (manzanas, lotes, incidentes, alertas SOS)
      incidentes/                    — listado, detalle, nuevo, mapa con heatmap/clustering
      requerimientos/                — reclamos de mantenimiento (flujo de estados)
      mascotas/                      — mascotas perdidas/encontradas
      panico/                        — panel de alertas SOS (recepción, para ADMIN/SEGURIDAD)
      seguridad/                     — vista de seguridad
      mi-suscripcion/                — página del vecino: estado de cuota + cómo pagar
      admin/                         — panel admin: usuarios, stats, cobranza
        usuarios/, cobranza/
    api/                             — API Routes REST (una carpeta por recurso)
  components/
    map/                             — capas de Leaflet (Manzanas, Lotes, Incidentes, Alertas)
    ui/                              — Sidebar, BottomNav, MobileHeader, banners, PWA install prompt
    forms/                           — ImageUpload reutilizable
  lib/
    auth.ts                          — config NextAuth
    permisos.ts                      — matriz central de roles por módulo
    api/guard.ts                     — requireSession / requireRole / requireRoleSession (server)
    api/rateLimit.ts, validation.ts, query.ts
    validation/*                     — schemas Zod por módulo (incidentes, mascotas, panico, etc.)
    cobranza.ts / cobranzaServer.ts  — lógica de estado de cuota, período, deuda
    actividad.ts                     — throttle de "última actividad" del usuario
    push/                            — enviarPush.ts, usePushNotifications.ts
    barrio/                          — datos de manzanas/lotes (geojson real del barrio)
    utils/sla.ts                     — cálculo de estado de SLA (en plazo / por vencer / vencido)
  generated/                         — cliente Prisma generado (no editar a mano)
  proxy.ts                           — middleware de Next 16 (auth edge, primera barrera)
  scripts/                           — seeds (admin, staff, vecino, lotes)
prisma/
  schema.prisma                      — modelo de datos completo
  migrations/
docs/
  proyect.md                         — spec funcional original (MVP)
  dev-rules.md                       — patrones y reglas de desarrollo del proyecto (leer antes de tocar código)
  backlog-cobranza.md                — fuente de verdad del módulo de cobranza, fase por fase
  *.geojson                          — geometría real de manzanas/parcelas del barrio (Horizonte 3)
```

### Patrones de arquitectura clave (documentados en `docs/dev-rules.md`)

1. **Guard de rol siempre en servidor**, nunca confiar en el cliente para ocultar rutas: cada Server Component de admin y cada API route restringida valida sesión + rol al inicio, con los helpers de `src/lib/api/guard.ts`.
2. **Defensa en profundidad de 2 capas**: `proxy.ts` (edge, verifica JWT) → guard en cada Server Component / route handler (verifica rol y datos finos).
3. **`dynamic(..., { ssr: false })` no se puede usar directo en Server Components** — para Leaflet (que toca `window`) se crea un wrapper cliente intermedio (`*Lazy.tsx`). Aplicado en `IncidentesMapaLazy.tsx`, `DetalleMapaMiniLazy.tsx`.
4. Validación **Zod compartida**: los schemas en `src/lib/validation/*` se usan tanto en el formulario (react-hook-form) como en el route handler.

---

## 4. Modelo de datos (resumen)

Entidades principales (Prisma, PostgreSQL):

- **Manzana / Lote / Residente** — estructura física real del barrio (datos geográficos reales cargados desde GeoJSON, barrio "Horizonte 3"). Un lote puede tener hasta 2 `Usuario` (cuenta de app) y N `Residente` (personas registradas sin cuenta propia).
- **Usuario** — cuenta de app: email/password (bcrypt), `rol`, `verificado` (alta requiere aprobación de admin), tracking de uso (`ultimoLoginAt`, `ultimaActividadAt`).
- **Incidente** — reportes de seguridad: tipo (`ROBO`, `ROBO_TENTATIVA`, `SOSPECHOSO`, `VANDALISMO`, `OTRO`), ubicación (lat/lon), imágenes, `prioridad`, `estado` (`ACTIVO`/`RESUELTO`/`FALSA_ALARMA`), `visibleVecinos` (control de qué ve el vecino vs. solo admin/seguridad).
- **AlertaPanico** + **ComentarioAlerta** — botón SOS: ubicación GPS, estado (`ENVIADO`→`RECIBIDO`→`EN_ATENCION`→`CERRADO`), quién atiende, y un hilo de comentarios/conversación entre el vecino y quien atiende.
- **Requerimiento** + **ComentarioReq** — reclamos de mantenimiento: categoría (`ILUMINACION`, `PODA`, `CALLES`, `LIMPIEZA`, `SEGURIDAD`, `INFRAESTRUCTURA`, `OTRO`), flujo `NUEVO → EN_PROGRESO → RESUELTO → CERRADO`.
- **MascotaPerdida** — `PERDIDA`/`ENCONTRADA`, foto, zona, contacto, estado abierta/resuelta.
- **ConfigSLA** — horas límite configurables por `Prioridad` (`CRITICO`/`ALTO`/`MEDIO`/`BAJO`), usado para calcular si un incidente/requerimiento está en plazo, por vencer o vencido.
- **PushSubscription** — una fila por dispositivo/navegador suscripto a Web Push.
- **VistaSeccion** — última vez que cada usuario vio una sección, para calcular badges de "nuevo" en el home.
- **Suscripcion** (1:1 con Usuario) + **Pago** — módulo de cobranza (detalle abajo).

---

## 5. Funcionalidades principales (qué expone la app)

### 5.1 Seguridad
- **Botón de pánico (SOS)**: mantener presionado 2–3s + vibración (evita falsos positivos), envía ubicación GPS + usuario + timestamp. Push nativo inmediato a ADMIN/SEGURIDAD (funciona con la app cerrada). Panel de recepción con listado + mapa. El vecino puede **responder/conversar** dentro de la alerta activa (`ComentarioAlerta`), y el panel de admin/seguridad se auto-refresca con las respuestas (sin polling manual).
- **Mapa de incidentes** con pines + clustering (heatmap real queda para cuando haya más volumen de datos), filtros por tipo y rango de fechas (7/30/90 días), control de visibilidad (solo admin vs. visible a vecinos).
- **Mapa general** (`/mapa`): capas togleables (Manzanas, Lotes, Incidentes, Alertas SOS), leyenda dinámica con conteo en tiempo real, badge de alertas activas.
- **SLA por prioridad**: cada incidente/requerimiento tiene prioridad y un tiempo límite configurable (`ConfigSLA`), con estado calculado (en plazo / por vencer / vencido).

### 5.2 Mantenimiento del barrio
- **Requerimientos/reclamos**: creación con foto, categoría, seguimiento de estado, comentarios, vista "Mis requerimientos" + listado general.

### 5.3 Comunidad
- **Mascotas perdidas/encontradas**: feed cronológico con foto, zona, contacto, filtros.

### 5.4 Administración de usuarios y lotes
- Alta con verificación manual por admin (`Usuario.verificado`), hasta 2 cuentas por lote.
- Panel `/admin` con métricas: total usuarios, verificaciones pendientes, incidentes activos, requerimientos abiertos, alertas de pánico activas, ocupación de lotes, **usuarios activos 7d/30d** (tracking de actividad real, no solo altas).
- `/admin/usuarios`: filtros, detalle por usuario, acciones (verificar, cambiar rol, etc.).

### 5.5 Cobranza / suscripciones (el módulo más nuevo y evolucionado)
Vecindar cobra una **cuota mensual por cuenta de usuario** (no por lote) a los vecinos. Implementado en fases:

- **Estado por usuario**: `Suscripcion` 1:1 con `Usuario` → `vigenteHasta`, `montoMensual` (o el default `CUOTA_MENSUAL_DEFAULT = $35.000`), `exento`. Estado derivado: `al_dia` / `vencida` / `sin_datos` / `exento`.
- **Panel `/admin/cobranza`** (ADMIN + rol `TESORERO`): tabla de todos los usuarios con su estado, registro **manual** de pagos (`Pago`: usuario + período `YYYY-MM` único, monto, método `TRANSFERENCIA`/`EFECTIVO`/`MERCADOPAGO`/`OTRO`), export a CSV.
- **`/mi-suscripcion`** (vecino): su estado, cuota, vigencia, cuánto adeuda, cómo pagar, historial completo de pagos.
- **`CobranzaBanner`**: banner global en el layout del dashboard, visible solo si el vecino está `vencida` (no bloquea nada — decisión explícita: **sin gate de acceso para morosos**, solo aviso).
- **Recordatorios push automáticos**: cron diario en Vercel (`vercel.json`, protegido con `CRON_SECRET`) que avisa 3 días antes de vencer, el día que vence, y cada 7 días mientras siga vencida.
- **Rol `TESORERO`**: puede gestionar cobranza sin tener acceso al resto del panel admin (usuarios, stats, verificaciones siguen ADMIN-only).
- **Integración MercadoPago (en rama sin mergear `feat/mercadopago-cobranza`, no está en `main` todavía)**: cliente REST directo sin SDK oficial, dos modalidades — link de pago por período y débito automático (`preapproval`) — con el registro manual como fallback. Webhook público con validación HMAC de firma.
- **Decisión de producto**: **no hay consecuencia de impago** (sin bloqueo de funciones), solo aviso vía banner + push. Fue evaluado y descartado explícitamente por el dueño del producto.

### 5.6 PWA / notificaciones
- Instalable (Android/iOS/desktop) vía `InstallPrompt.tsx` + `manifest.json`.
- Web Push real (VAPID) con Service Worker propio — no es una notificación simulada, funciona con la app/navegador cerrado.
- Opt-in de push con banner dedicado (`PushOptInBanner`) y toggle en la UI.

---

## 6. Estado actual (qué está en `main` vs. en ramas sin mergear)

**En `main` (deployado / listo para prod)**: todo lo de la sección 5, incluido el módulo de cobranza completo hasta recordatorios push automáticos (Fase 3c), rol TESORERO, y actividad de usuarios.

**En ramas locales sin mergear (existen, no están en `main`)**:
- `feat/mercadopago-cobranza` — integración de pagos online con MercadoPago.
- `feat/datos-pago` — carga de los datos reales de transferencia (alias, CVU, titular) en `DATOS_PAGO`. En `main`, esos campos están vacíos y la página "Mi suscripción" solo muestra la nota genérica ("enviá el comprobante al admin").

**Pendiente de configuración de infraestructura (fuera del código)**:
- Cargar `CRON_SECRET` como env var en Vercel (si no está, el cron de recordatorios no manda push en prod).
- Alta de la app de MercadoPago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, alta del webhook) y `NEXT_PUBLIC_SITE_URL` con el dominio real.
- Asignar el rol `TESORERO` a una persona real desde `/admin/usuarios/[id]`.

---

## 7. Historial de implementación (resumen cronológico, de más antiguo a más nuevo)

1. Dashboard inicial completo: inicio, mapa, incidentes, mascotas, pánico SOS, requerimientos, admin (MVP funcional de punta a punta).
2. Soporte de fotos/adjuntos en incidentes, mascotas y requerimientos (upload con preview, luego migrado a Supabase Storage en vez de filesystem local — necesario para que persista en Vercel, que tiene filesystem efímero).
3. Refactor de arquitectura y estructura de carpetas + adopción de skills/buenas prácticas de diseño.
4. Hasta 2 cuentas de usuario por lote.
5. Popup + alarma sonora para SOS, aviso de registro, modal de éxito.
6. El vecino puede responder dentro de una alerta de pánico activa (conversación bidireccional) + fix de auto-refresh del panel admin/seguridad.
7. Refactor de nombre/apellido en campos separados con validación Zod en formularios.
8. Fix de notificaciones push que no llegaban con la app cerrada + landing en `/inicio`.
9. Fix de migraciones de Prisma colgándose contra el connection pooler en modo transacción (Supabase/Vercel).
10. PWA instalable + permisos por rol + refactor de API/auth (introducción de `src/lib/api/guard.ts` y la matriz de permisos).
11. Seguimiento de actividad de usuarios (`ultimoLoginAt`/`ultimaActividadAt`) para métricas reales de uso en el panel admin.
12. **Módulo de cobranza/suscripciones** (Fases 1 a 3c descritas en la sección 5.5), incluyendo el rol TESORERO y los recordatorios push automáticos — el desarrollo más reciente y más grande del proyecto.
13. (En rama, no mergeado) Integración de pagos online con MercadoPago.

---

## 8. Convenciones que vale la pena que Claude conozca antes de sugerir cambios

- El código de negocio y los nombres de dominio están **en español** (`Usuario`, `Lote`, `Requerimiento`, `estadoCobranza`, etc.) — mantener esa convención en cualquier código nuevo.
- Antes de tocar auth/roles: leer `src/lib/permisos.ts` y `docs/dev-rules.md`.
- Antes de tocar cobranza: `docs/backlog-cobranza.md` es la fuente de verdad fase por fase, más detallada que este documento.
- El proyecto trabaja con **rama por feature + PR en GitHub**, pero el dueño mergea los PRs manualmente.
- Prisma 7 con el generator `prisma-client` (no `prisma-client-js`): los tipos/imports salen de `@/generated/*`, no de `@prisma/client`.
- La DB local corre en un contenedor Docker (`vecindar-postgres`) que a veces hay que levantar a mano.
