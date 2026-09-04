# Backlog — Cobranza / Suscripciones

Vecindar cobra una suscripción mensual a los vecinos. Este documento lista lo
hecho y lo pendiente del módulo de cobranza.

**Última actualización:** 04/09/2026

---

## Estado actual

### Fase 1 — Seguimiento de actividad (hecha, en prod)

- `Usuario.ultimoLoginAt` / `Usuario.ultimaActividadAt`.
- Throttle de escritura en `src/lib/actividad.ts` (una escritura cada 10 min por
  usuario), llamado desde `requireSession` / `requireRoleSession` y el layout del
  dashboard.
- `/admin/usuarios`: columna "Actividad" (tiempo relativo + punto "en línea") y
  filtro Activos 7d / 30d / Inactivos +30d.
- `/admin`: tarjetas "Activos últimos 7 / 30 días".

### Fase 2 — Panel de cobranza manual (hecha)

- Modelos `Suscripcion` (1:1 con `Usuario`) y `Pago` (`usuarioId` + `periodo`
  "YYYY-MM", único). Enum `MetodoPago`.
- `src/lib/cobranza.ts`: estado derivado (`al_dia` / `vencida` / `sin_datos` /
  `exento`) a partir de `vigenteHasta` vs. hoy. `CUOTA_MENSUAL_DEFAULT`.
- `src/lib/cobranzaServer.ts`: `recalcularVigencia()` — `vigenteHasta` = fin del
  mes del período más alto pago, o `null`.
- API (solo ADMIN): `POST /api/cobranza/pagos`, `DELETE /api/cobranza/pagos/[id]`,
  `PATCH /api/cobranza/suscripcion/[usuarioId]`, `GET /api/cobranza/export?anio=`.
- `/admin/cobranza`: resumen por estado, cobrado del mes/año, tabla con filtros y
  búsqueda, diálogo por usuario (registrar pago + ajustes: exento, cuota propia,
  nota), exportar CSV.
- `/admin/usuarios/[id]`: bloque "Suscripción" (estado, vigencia, últimos pagos).

### Fase 3a — Vecino ve su suscripción + aviso de mora (hecha, rama `feat/mi-suscripcion`)

- **`/mi-suscripcion`** (nueva, todos los roles): estado (al día / vencida / sin
  registro / exento), cuota mensual, cobertura hasta, meses adeudados + deuda
  estimada, bloque "Cómo pagar" (con `DATOS_PAGO`) e historial **completo** de
  pagos (contador + lista con período, método, fecha, monto).
- **`CobranzaBanner`** (`src/components/ui/CobranzaBanner.tsx`): aviso global en
  el layout del dashboard, aparece solo si `estadoCobranza === "vencida"`. Link a
  `/mi-suscripcion` + "recordar más tarde" (oculta hasta recargar la app, sin
  persistencia). No se muestra en la propia página de detalle. **El botón de
  pánico no se toca.**
- `src/lib/cobranza.ts`: helpers `mesesVencidos()` y `deudaEstimada()`,
  `METODO_PAGO_LABEL` centralizado (`CobranzaTabla` lo importa en vez de
  duplicarlo), y config `DATOS_PAGO`.
- Link "Mi suscripción" en `Sidebar` y `MobileHeader` para todos los roles.
- El layout del dashboard hace un `findUnique` extra de `Suscripcion` (índice
  único) por request para saber si mostrar el banner.
- **Sin gate de solo-lectura todavía** (ver backlog #1).

### Fase 3b — Rol `TESORERO` (hecha)

- `enum Rol` suma `TESORERO` (migración `add_rol_tesorero`).
- `src/lib/permisos.ts`: nueva `GESTORES_COBRANZA = ["ADMIN", "TESORERO"]`.
- `/admin/cobranza` y las 4 rutas de su API (`pagos`, `pagos/[id]`,
  `suscripcion/[usuarioId]`, `export`) ahora gatean con `GESTORES_COBRANZA` en
  vez de `GESTORES_USUARIOS` (ADMIN-only) — el tesorero puede registrar pagos,
  ajustar suscripciones y exportar CSV, sin acceso al resto de `/admin`
  (gestión de usuarios, verificaciones, stats generales, que siguen ADMIN-only).
- Nav directa a `/admin/cobranza` ("Cobranza") en `Sidebar` y `MobileHeader`
  para el rol `TESORERO`, igual que `/seguridad` para `SEGURIDAD`.
- `TESORERO` sumado a los selectores de rol de `/admin/usuarios` (filtro,
  badge, y el selector de `AccionesUsuario` para asignarlo).
- `src/scripts/seed-usuario-staff.ts`: agrega `tesorero@vecindar.local` para
  pruebas locales.

**Configuración nueva**

- `DATOS_PAGO` en `src/lib/cobranza.ts`: alias / CBU / titular / nota que ve el
  vecino en "Cómo pagar". Hoy solo tiene la nota; completar a mano hasta que
  exista MercadoPago (backlog #4).

**Decisiones tomadas**

- Cobro **por cuenta de usuario** (no por lote).
- Registro **manual** de pagos (sin integración de pago todavía).
- **Sin consecuencia de impago**: el sistema solo muestra el estado, no cambia
  nada para el vecino.

**Configuración**

- `CUOTA_MENSUAL_DEFAULT` en `src/lib/cobranza.ts`: cuota mensual general (pesos).
  Actual: `35000` (incluye seguridad + app). Se sobreescribe por usuario con
  `Suscripcion.montoMensual`.

---

## Backlog (sin fecha)

### 1. Gate para morosos

El **banner** de "tu cuota venció" ya está hecho (Fase 3a). Falta el **modo
solo-lectura**: el moroso puede ver pero no crear incidentes, requerimientos,
etc. **El botón de pánico nunca se bloquea.** Pendiente decidir si se hace o
alcanza con el aviso.

### 2. Recordatorios push automáticos

Notificaciones de vencimiento ("vence en 3 días", "cuota vencida"). Necesita
**Vercel Cron** — hoy no hay ningún cron configurado (`vercel.json` no existe).
La infraestructura de push ya está lista (`src/lib/push/enviarPush.ts`).

### 3. Página "Mi suscripción" para el vecino — ✅ hecha (Fase 3a)

Estado, vigencia, deuda estimada, historial de pagos y datos de transferencia
ya están en `/mi-suscripcion`. Falta solo el "link de pago" (depende de #4).

### 4. Integración MercadoPago

Link de pago por período o `preapproval` (débito automático mensual), con webhook
que actualiza `Suscripcion.vigenteHasta` automáticamente. Elimina la carga
manual.

### 5. Rol `TESORERO` — ✅ hecho (Fase 3b)

Gestiona cobranza (`/admin/cobranza` + su API) sin ser ADMIN completo. Falta
asignárselo a alguien real desde `/admin/usuarios/[id]`.
