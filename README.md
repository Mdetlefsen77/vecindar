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

Tests: `npm test` (vitest, no carga `.env`).

### Clima del inicio (opcionales)

La tarjeta del clima de `/inicio` consulta [Open-Meteo](https://open-meteo.com) desde el servidor (caché de 30 min, timeout de 3 s). Muestra la temperatura actual y el estado del cielo, y los datos de hoy en la zona horaria de Córdoba: máxima, mínima y probabilidad de lluvia ("Máx 24°C · Mín 15°C · Lluvia 49%"). Con 50% de lluvia o más agrega "☔ Llevá paraguas". Si un dato del día falta o no es un número válido, se omite solo ese; si falla la consulta o la temperatura actual, la tarjeta no se muestra.

Si el pronóstico de hoy o de mañana trae clima fuerte, arriba de la tarjeta aparece un cartel ámbar con qué viene, cuándo y un consejo ("Tormenta hoy", "Entrá las cosas de afuera"). Lo disparan los códigos de tormenta (95, 97 y 98) y granizo (96 y 99), ráfagas de 60 km/h o más y una máxima de 38 °C o más. Se muestra uno solo: primero hoy y, dentro del día, granizo, tormenta, viento y calor, en ese orden. El granizo solo aparece si el modelo lo informa. Si falla la consulta no hay cartel, y un dato inválido no dispara nada.

Toda la tarjeta es un enlace a `/clima` ("Ver pronóstico ›"), una página que exige sesión y muestra los próximos 3 días, sin repetir hoy: "Mañana" y los dos siguientes con su nombre ("Sábado 7"), cada uno con ícono, estado del cielo, máxima, mínima y probabilidad de lluvia. Hace su propia consulta a Open-Meteo (`forecast_days=4`, misma caché y timeout). Un dato inválido se omite solo en ese día; si la consulta falla o no trae los 4 días, muestra "No pudimos traer el pronóstico, probá más tarde" y un enlace al inicio.

| Variable | Por defecto | Para qué |
|---|---|---|
| `OPEN_METEO_URL` | `https://api.open-meteo.com` | URL base. Con el plan comercial: `https://customer-api.open-meteo.com` |
| `OPEN_METEO_API_KEY` | (sin clave) | API key del plan comercial; se envía como `apikey=` |

El plan gratis de Open-Meteo es para uso no comercial.
