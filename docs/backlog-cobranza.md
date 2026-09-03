# Backlog — Cobranza / Suscripciones

Vecindar cobra una suscripción mensual a los vecinos. Este documento lista lo
hecho y lo pendiente del módulo de cobranza.

**Última actualización:** 02/09/2026

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

**Decisiones tomadas**

- Cobro **por cuenta de usuario** (no por lote).
- Registro **manual** de pagos (sin integración de pago todavía).
- **Sin consecuencia de impago**: el sistema solo muestra el estado, no cambia
  nada para el vecino.

**Configuración**

- `CUOTA_MENSUAL_DEFAULT` en `src/lib/cobranza.ts`: cuota mensual general (pesos).
  Actual: `5000`. Se sobreescribe por usuario con `Suscripcion.montoMensual`.

---

## Backlog (sin fecha)

### 1. Aviso / gate para morosos

Banner "tu cuota venció" dentro de la app y/o modo solo-lectura (puede ver pero
no crear incidentes, requerimientos, etc.). **El botón de pánico nunca se
bloquea.**

### 2. Recordatorios push automáticos

Notificaciones de vencimiento ("vence en 3 días", "cuota vencida"). Necesita
**Vercel Cron** — hoy no hay ningún cron configurado (`vercel.json` no existe).
La infraestructura de push ya está lista (`src/lib/push/enviarPush.ts`).

### 3. Página "Mi suscripción" para el vecino

Estado, fecha de vigencia, historial de pagos, datos de transferencia / link de
pago.

### 4. Integración MercadoPago

Link de pago por período o `preapproval` (débito automático mensual), con webhook
que actualiza `Suscripcion.vigenteHasta` automáticamente. Elimina la carga
manual.

### 5. Rol `TESORERO`

Gestiona cobranza sin ser ADMIN completo. Hoy `/admin/cobranza` y su API son
ADMIN-only (`GESTORES_USUARIOS`).
