# Backlog · Clima en el inicio

## Decisiones del MVP
- **Recurso:** el clima de Córdoba, solo lectura. No se guarda en la base de datos.
- **Fuente:** Open-Meteo (`api.open-meteo.com`), gratis y sin API key. Se consulta desde el servidor con caché de Next (`revalidate`) para no llamar al servicio en cada visita.
- **Ubicación:** coordenadas fijas del barrio en Córdoba. El valor exacto se decide en `/story HU-01`.
- **Dónde se ve:** tarjeta arriba de todo en `/inicio` (`src/app/(dashboard)/inicio/page.tsx`). Tiene que poder leerse sin esfuerzo: texto grande y estado del cielo con palabra + ícono (ver diseño para usuarios grandes).
- **Stack:** el de `## Proyecto` en `CLAUDE.md`. No hay tests todavía: la HU-01 monta el runner (vitest sugerido).
- **Si el servicio falla:** el inicio carga igual, sin la tarjeta o con un texto neutro. Nunca un error.

**Fuera de alcance:** otras ciudades o ubicación por GPS de cada vecino, historial del clima, radar o mapas meteorológicos, alertas oficiales del SMN, configuración de la tarjeta por vecino, guardar datos del clima en la base.

## ✅ HU-01 · Clima actual en el inicio
Como **vecino** quiero **ver arriba del inicio la temperatura actual y si está soleado, nublado, lloviendo, etc.** para **saber cómo está el día sin salir de la app**.
- Arriba de todo en `/inicio` aparece una tarjeta con la temperatura actual en °C, sin decimales, y el estado del cielo en castellano (Despejado, Parcialmente nublado, Nublado, Niebla, Llovizna, Lluvia, Tormenta, etc.) con su ícono.
- Los datos salen de Open-Meteo para las coordenadas del barrio y se reutilizan por un tiempo fijo, sin pedirlos en cada visita.
- Si Open-Meteo falla o tarda demasiado, `/inicio` responde 200 igual, con el resto de las secciones y sin error visible.
- Incluye el andamiaje: runner de tests instalado, script `npm test` y el primer test en verde.

## HU-02 · Máxima, mínima y lluvia de hoy
Como **vecino** quiero **ver en la tarjeta la máxima y la mínima del día y la probabilidad de lluvia** para **planear el día (ropa, riego, salir o no)**.
- La tarjeta muestra la máxima y la mínima de hoy en °C y la probabilidad máxima de lluvia del día en %.
- Si la probabilidad de lluvia supera un umbral, se destaca con un texto claro (por ejemplo, "Llevá paraguas").
- Si falta algún dato del día, la tarjeta muestra lo que tiene y no muestra "undefined" ni "NaN".

## HU-03 · Pronóstico de los próximos días
Como **vecino** quiero **tocar la tarjeta del clima y ver el pronóstico de los próximos 3 días** para **organizar la semana**.
- Al tocar la tarjeta se abre `/clima`, que muestra los próximos 3 días con el nombre del día, el ícono y estado, la máxima, la mínima y la probabilidad de lluvia.
- `/clima` exige sesión: sin sesión, redirige a `/login`.
- Si el servicio falla, `/clima` muestra un mensaje claro ("No pudimos traer el pronóstico, probá más tarde") y un botón para volver al inicio.

## HU-04 · Aviso de clima fuerte en el inicio
Como **vecino** quiero **ver un cartel destacado cuando viene tormenta, granizo, viento fuerte o calor extremo** para **prepararme a tiempo (guardar el auto, entrar cosas, tomar agua)**.
- Si el pronóstico de hoy o de mañana trae tormenta o granizo, ráfagas por encima de un umbral o una máxima por encima de un umbral, el inicio muestra un cartel arriba de la tarjeta con qué viene, cuándo (hoy o mañana) y un consejo práctico.
- Sin clima fuerte en el pronóstico, no hay cartel.
- El cartel no usa el rojo de emergencias: ese color queda para SOS y pánico.

## HU-05 · Notificación push por clima fuerte
Como **vecino** quiero **recibir una notificación en el celular cuando se espera clima fuerte** para **enterarme aunque no abra la app**.
- Un cron diario (`GET /api/cron/alerta-clima`, con `Authorization: Bearer ${CRON_SECRET}`) revisa el pronóstico con las mismas reglas de HU-04 y, si hay clima fuerte, manda una push a los vecinos suscritos con qué viene y cuándo.
- Sin el token correcto responde 401 y no manda nada.
- No repite la misma alerta para el mismo día aunque el cron corra más de una vez.
- Sin clima fuerte, responde 200 sin mandar push.

## Notas
- 2026-11-04 · (HU-05) En el plan Hobby de Vercel los crons son solo diarios: la push sale a una hora fija, así que una tormenta que se forma en el día puede no avisarse a tiempo. Hay que elegir la hora en `/story HU-05`.
- 2026-11-04 · (HU-01) Los datos de Open-Meteo tienen licencia CC BY 4.0, que pide atribución: agregar un "Datos: Open-Meteo" chico en la tarjeta o en `/clima`. Su plan gratis es para uso no comercial; Vecindar cobra suscripción. Resuelto en HU-01: atribución en la tarjeta y plan gratis por ahora, con `OPEN_METEO_URL`/`OPEN_METEO_API_KEY` listas para pasar al plan comercial. **Pendiente:** decidir cuándo contratarlo.
- 2026-11-04 · (HU-01) `npm install` informa vulnerabilidades en `npm audit`; no se revisaron.
- 2026-11-04 · (HU-01) vitest quedó en 4.x porque vitest 5 pide `@types/node` ≥22 y el repo tiene 20 (Node local 22). Subir `@types/node` a ^22 destraba vitest 5.
- 2026-11-04 · (HU-01) Hardening de la tarjeta del clima (la temperatura no finita se resuelve en HU-02): `encodeURIComponent` sobre `OPEN_METEO_API_KEY` en la URL; rechazar `http://` en `OPEN_METEO_URL` (la key viajaría en claro); un test que fije que la URL (con la key) no se loguea; validar `typeof weather_code === "number"`.
