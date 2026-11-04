## Proyecto
- **Stack:** TypeScript 5 (strict) · Next.js 16.1.6 (App Router) + React 19.2.3 · Prisma 7.4.1 + PostgreSQL · NextAuth 5 beta · zod 4 · npm (`package-lock.json`)
- **Instalar:** `npm install`
- **Tests:** pendiente (sin runner ni tests; se monta en la primera historia, vitest sugerido en `docs/proposal-reportes.md:199`) · **un test:** pendiente · **por nombre:** pendiente
- **Typecheck:** `npx tsc --noEmit --incremental false` · **Lint:** `npm run lint` · **Build:** `npm run build` (ver Efectos)
- **Levantar:** `npm run dev` (puerto 3000; requiere `DATABASE_URL` en `.env`)
- **Tests en:** pendiente · helpers: pendiente
- **Git:** principal `main` · ramas `feat/`, `fix/`, `chore/` · remoto `origin` (github.com/Mdetlefsen77/vecindar) · host github · integración `pr → main` · commits conventional commits con scope opcional (`feat(mapa): …`) · tags semver del producto (`v0.1.0`, uno por merge de historia)
- **Efectos:** ⚠ `npm run build` corre `prisma generate` (reescribe `src/generated/`, versionado) y `scripts/migrar.mjs` → `prisma migrate deploy` contra la DB del `.env` si no hay `VERCEL_ENV` (preview/local = DB de prod) · ⚠ `npx tsx src/scripts/seed-*.ts` escribe en la DB; `seed-lotes.ts --reset` borra manzanas, lotes y requerimientos · ⚠ `npm run format` reescribe todo el repo · ⚠ `/api/cron/*` escriben en la DB y mandan push
- **Lint solo avisa:** `no-unused-vars`, `no-unused-expressions`, `jsx-a11y/*`, `import/*` son `warn`
- **Estructura:** `src/app/(dashboard)/` páginas autenticadas · `src/app/(auth)/` login/registro · `src/app/api/<recurso>/route.ts` · `src/components/<módulo>/` · `src/lib/` dominio y helpers (`api/guard.ts`, `api/validation.ts`, `validation/` zod, `permisos.ts`, `secciones.ts`, `push/`, `prisma/client.ts`) · `src/generated/` cliente Prisma · `src/scripts/` seeds · `src/proxy.ts` guard de sesión · `prisma/` schema y migraciones · `docs/` specs y `dev-rules.md` · `openspec/`
- **Arquitectura:** `route.ts` / `page.tsx` → `@/lib/prisma/client` directo → PostgreSQL (sin services ni repositories). `src/components/` no importa prisma. Los componentes cliente usan `fetch("/api/…")`. Las reglas de roles están en `src/lib/permisos.ts` (ver `docs/dev-rules.md`).
- **Receta · endpoint (ejemplo: `POST /api/avisos`):**
  1. `prisma/schema.prisma` + `npx prisma migrate dev --name <nombre>` (el cliente se regenera en `src/generated/`, deducido)
  2. schema zod en `src/lib/validation/<módulo>.ts`
  3. constantes y labels en `src/lib/<módulo>.ts`, sin imports de servidor
  4. `src/app/api/<recurso>/route.ts`: `requireSession()` → `schema.safeParse(await req.json().catch(() => ({})))` → `respuestaValidacion(parsed.error)` → `prisma.*` → `NextResponse.json(…, { status: 201 })`
  5. si es una página nueva: `src/proxy.ts` (`RUTAS_PROTEGIDAS` + `matcher`) y `src/lib/secciones.ts`
  6. si hay roles: `src/lib/permisos.ts`
- **Receta · pantalla (ejemplo: `/avisos`):** `src/app/(dashboard)/<sección>/page.tsx` Server Component con `auth()` → `redirect("/login")` → `prisma` · interactividad en `src/components/<sección>/*.tsx` o `"use client"` + `fetch` · entrada en `proxy.ts` y `secciones.ts`
- **Receta · cron (ejemplo: `limpiar-avisos`):** `src/app/api/cron/<nombre>/route.ts` `GET` con `Authorization: Bearer ${CRON_SECRET}` + entrada en `vercel.json` `crons` (Hobby: solo diarios)
- **Patrones:**
  - validación: zod + `respuestaValidacion` (`src/lib/api/validation.ts`) (también hay `safeParse` con 400 a mano en otras routes, no se sigue)
  - errores: `NextResponse.json({ error }, { status })` inline; guards `requireSession`/`requireRole` devuelven `{ response }` (también hay `HttpError` en `usuarios/route.ts` para cortar transacciones)
  - config: `process.env.*` directo, sin `.env.example`
  - logs: `console.error`/`console.warn`, sin logger
  - UI: público mayor, con botones y textos grandes, un color por sección (`src/lib/secciones.ts`) y rojo solo para emergencias
