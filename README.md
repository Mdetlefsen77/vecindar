# Vecindar

**Tu barrio conectado**

Aplicación web (PWA instalable) de gestión comunitaria para un barrio privado/cerrado: seguridad, mantenimiento y cobranza de cuota, todo en un solo lugar en vez de un grupo de WhatsApp.

> Contexto completo del proyecto (para pegar en un chat de IA, onboarding, etc.): [`docs/contexto-vecindar.md`](docs/contexto-vecindar.md).

## Features

- 🚨 Botón de pánico (SOS) con ubicación GPS, push nativo y conversación con quien atiende
- 🗺️ Mapa de incidentes con clustering + mapa general del barrio (manzanas, lotes, alertas)
- 📋 Sistema de requerimientos/reclamos (iluminación, poda, calles...) con flujo de estados
- 🐕 Mascotas perdidas/encontradas
- 👥 Gestión de vecinos, lotes y verificación de altas
- 💳 Cobranza de cuota mensual: panel admin, registro manual de pagos, página "Mi suscripción", recordatorios push automáticos
- 📊 Dashboard de administración con métricas de uso (usuarios activos 7d/30d)
- 📱 PWA instalable con Web Push real (funciona con la app cerrada)

## Roles

`VECINO` · `REFERENTE_MANZANA` · `SEGURIDAD` · `TESORERO` · `ADMIN` — matriz de permisos por módulo centralizada en `src/lib/permisos.ts`.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma 7 (generator `prisma-client`, cliente en `src/generated/`)
- **Auth:** NextAuth.js v5 (beta), Credentials + bcrypt, sesión JWT
- **Maps:** Leaflet + react-leaflet + OpenStreetMap
- **Notificaciones:** Web Push nativo (VAPID) + Service Worker propio
- **Storage de imágenes:** Supabase Storage
- **Formularios/validación:** react-hook-form + Zod (schemas compartidos cliente/servidor)
- **Hosting:** Vercel (+ Vercel Cron para recordatorios de cobranza)

## Estructura

```
src/app/(dashboard)/   páginas autenticadas: inicio, mapa, incidentes, requerimientos,
                        mascotas, panico, mi-suscripcion, admin (usuarios, cobranza)
src/app/api/            API Routes, una carpeta por recurso
src/components/         map/ (capas Leaflet), ui/, forms/
src/lib/                auth, permisos, guards de API, validaciones Zod, cobranza, push
src/generated/           cliente Prisma generado (no editar a mano)
prisma/schema.prisma     modelo de datos completo
docs/                    dev-rules.md (patrones del proyecto), backlog-cobranza.md,
                          contexto-vecindar.md (contexto completo)
```

## Desarrollo

```bash
npm install
npm run dev
```

Requiere Postgres corriendo (`DATABASE_URL` en `.env`) y las migraciones aplicadas (`npx prisma migrate deploy`). Ver `.env` para el resto de las variables (NextAuth, VAPID, Supabase, Cron, MercadoPago).
