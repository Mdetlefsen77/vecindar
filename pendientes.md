# Pendientes de Vecindar

Listado vivo de lo que quedó por hacer, para ir armando historias paso a paso con odd-harness (`/backlog` → `/story` → `/pair` → `/revisar` → `/done`). Al pasar un punto a una historia, anotar su id al lado; al cerrarla, tacharlo.

Fuentes: `## Notas` de `backlog.md` (clima, HU-01..05), las ramas sin integrar y lo que dejó cada módulo. Estado al 2026-11-07.

Prioridad: **A** riesgo real o algo roto · **B** mejora con valor claro · **C** cuando haya uso o pedido.

## 1. Seguridad

| # | Prio | Qué | Estado | Dónde |
|---|---|---|---|---|
| S-1 | A | `/wrapped/[anio]` no está en `RUTAS_PROTEGIDAS`, queda fuera de `(dashboard)` y no llama a `auth()`. Falta ver qué datos muestra, si otra capa la protege y la ruta `imagen` | sin confirmar | `src/app/wrapped/[anio]/`, `src/proxy.ts` |
| S-2 | A | Una cuenta desaprobada podría conservar el acceso hasta que venza el JWT (90 días): `verificado` solo se mira en `authorize` | sospecha | `src/lib/auth.ts:48,97`, `layout.tsx:44-47` |
| S-3 | B | `router.push(callbackUrl \|\| "/inicio")` sin exigir mismo origen en login y registro (posible redirect abierto) | sospecha | `login/page.tsx:9,37`, `registro/page.tsx:62,150` |
| S-4 | B | Con https, el proxy busca `authjs.session-token` y Auth.js emite `__Secure-authjs.session-token`: mandaría a `/login` a vecinos con sesión | confirmado en la librería, falta ver producción | `src/proxy.ts:25-30`, `src/lib/auth.ts` |
| S-5 | B | El bloqueo de prueba vencida está solo en el layout; falta ver si una navegación RSC lo reejecuta | sospecha | `layout.tsx:54-55` |
| S-6 | B | Previews de Vercel con la DB de producción: si un preview tiene `CRON_SECRET`, puede gastar el aviso de clima del día o mandar push reales | validar config de Vercel | Vercel → env vars por entorno |
| S-7 | C | Hardening de crons y Open-Meteo: token comparado con `!==` (no en tiempo constante), `apikey` sin `encodeURIComponent`, `fetch` sin `redirect: "error"`, cuerpo sin límite, log del error completo de Prisma/push, rechazar `http://` en `OPEN_METEO_URL` | hardening | `src/app/api/cron/*`, `TarjetaClima.tsx`, `clima/page.tsx` |

## 2. Algo que no corre o no está configurado

| # | Prio | Qué | Dónde |
|---|---|---|---|
| R-1 | A | El cron `recordatorio-parte` no lo dispara nadie: el workflow de GitHub Actions que lo programa quedó en la rama `feat/oficios-seguridad`, sin integrar (ver §6) | `src/app/api/cron/recordatorio-parte/route.ts` |
| R-2 | A | Variables de entorno en Vercel a confirmar: `CRON_SECRET` (crons de cobranza, avisos, clima), y para MercadoPago `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL` | Vercel |
| R-3 | B | Asignar el rol `TESORERO` a una persona real | `/admin/usuarios/[id]` |
| R-4 | C | `npm audit` informa vulnerabilidades sin revisar; vitest quedó en 4.x hasta subir `@types/node` a ^22 | `package.json` |

## 3. Clima (después de HU-05)

| # | Prio | Qué |
|---|---|---|
| CL-1 | B | Validar en Vercel la caché de la tarjeta del inicio: podría servir un "Tormenta hoy" viejo con Open-Meteo caído o tras horas sin tráfico (needs_validation, ver nota HU-04 en `backlog.md`) |
| CL-2 | B | Validar los umbrales del cartel y la push (60 km/h, 38 °C) con datos del barrio; fijar `wind_speed_unit=kmh` |
| CL-3 | C | Avisar una tormenta que se forma después de las 8 (el plan Hobby solo admite un cron diario) |
| CL-4 | C | Elegir por vecino si recibe la push de clima |
| CL-5 | C | Reintentar un envío fallido o volver a avisar si el pronóstico cambia en el día |
| CL-6 | C | Limpiar las filas viejas de `alertas_clima` |
| CL-7 | B | Decidir cuándo contratar el plan comercial de Open-Meteo (el gratis es no comercial y Vecindar cobra) |
| CL-8 | C | Detalles de la tarjeta y `/clima`: `<p>` vacío si faltan Máx/Mín/Lluvia, lluvia sin acotar a [0, 100], fechas inválidas en `/clima` ("Invalid Date"), I-5 de `TarjetaClima.test.tsx` mira todo el HTML |

## 4. Módulos con etapas pendientes

Según lo que dejó cada módulo; verificar contra el código antes de armar la historia.

| # | Prio | Módulo | Qué |
|---|---|---|---|
| M-1 | B | Cobranza | Integrar MercadoPago (link de pago + débito automático), hoy en rama sin integrar (ver §6) |
| M-2 | C | Cobranza | Decisiones abiertas con el compañero: descuento por pronto pago o trimestral, consecuencia suave por mora, "% del barrio que pagó" en el inicio |
| M-3 | C | Avisos (etapa 2) | Convertir aviso en pedido (admin), conexión con Oficios, mapa, evaluar "Avisos" en la barra de abajo |
| M-4 | C | Oficios (etapa 2) | Oficios externos recomendados por vecinos, métricas de contactos, oficios en el reporte mensual y en el Wrapped; exigir aporte al día para publicar (sin decidir) |
| M-5 | C | Mapa | Lugares del barrio (faltan las ubicaciones reales); etapa 2: coordenadas y pines en avisos, pedidos y mascotas; etapa 3: manzanas por incidentes, cámaras, luminarias |
| M-6 | C | Reportes | Fases siguientes de `docs/tasks-reportes.md` |
| M-7 | C | Crecimiento | Email (en pausa por falta de dominio para Resend); incentivo por referido sin aprobar |

## 5. Calidad y deuda

| # | Prio | Qué |
|---|---|---|
| D-1 | C | Los tests de `route.test.ts` de clima espían `console.error` sin restaurarlo (`vi.restoreAllMocks` en `afterEach`) |
| D-2 | C | `vitest.config.ts` avisa "ESM syntax in a file loaded as CommonJS" |

## 6. Ramas sin integrar

Cuatro ramas tienen commits que no están en `main`. Todas salieron de un `main` de hace 1 a 3 meses (174 a 253 commits atrás), así que hay que traerlas al día antes de integrarlas.

| Rama | Commit | Qué tiene | Por qué no se integró (deducido) | Propuesta |
|---|---|---|---|---|
| `feat/mercadopago-cobranza` | `c4399da` 2026-09-05 | MercadoPago Fase 3d: `src/lib/mercadopago.ts`, `POST /api/cobranza/mp/checkout`, `POST /api/cobranza/mp/webhook` (HMAC), tarjeta "Pagar online" en `/mi-suscripcion` | La migración ya se trajo a `main` (`d79748a`, para destrabar migraciones), pero el código no. Quedó a la espera de crear la app de MP y cargar las variables, y de decidir con el compañero el débito automático | Reemplazada por la `-actualizada`: borrar esta |
| `feat/mercadopago-cobranza-actualizada` | `971e1d2` 2026-09-22 | El mismo commit, con `main` mergeado encima (7 archivos, +653) | Igual que la anterior | Historia de cobranza (M-1): rebase sobre `main`, tests del webhook (firma, idempotencia), probar en sandbox de MP, configurar variables (R-2). Tiene `Seguridad: sí` (webhook público + pagos) |
| `feat/oficios-seguridad` | `57a4d34` 2026-10-13 | Solo `.github/workflows/recordatorio-parte.yml`: GitHub Actions llama al cron 4 veces por día (30 min después de cada turno) | El endpoint se mergeó (PR #36) pero el workflow quedó en esta rama con un nombre que no tiene que ver. Pide el secret `CRON_SECRET` y la variable `SITE_URL` en GitHub | Historia corta (R-1): integrar el workflow, cargar el secret y la variable, probarlo con `workflow_dispatch` |
| `fix/vapid-error-claro` | `b2bd127` 2026-08-05 | Mensaje claro si falla la clave VAPID al activar las notificaciones (`fetchPublicKey` que tira error en vez de `undefined`) | Solo local, nunca se pusheó. `usePushNotifications.ts` cambió mucho después (`ceee1f4`) y hoy sigue sin manejar ese error | Rehacer sobre el código actual como un fix chico con su test; borrar la rama |
