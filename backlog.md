# Backlog · Vecindar

HU-01..05: clima en el inicio. HU-06 en adelante: pendientes de `pendientes.md`, por tandas (tanda 1: HU-06..09; tanda 2: HU-10..12).

## Decisiones del MVP
**Clima (HU-01..05)**
- **Recurso:** el clima de Córdoba, solo lectura. No se guarda en la base de datos.
- **Fuente:** Open-Meteo (`api.open-meteo.com`), gratis y sin API key. Se consulta desde el servidor con caché de Next (`revalidate`) para no llamar al servicio en cada visita.
- **Ubicación:** coordenadas fijas del barrio en Córdoba. El valor exacto se decide en `/story HU-01`.
- **Dónde se ve:** tarjeta arriba de todo en `/inicio` (`src/app/(dashboard)/inicio/page.tsx`). Tiene que poder leerse sin esfuerzo: texto grande y estado del cielo con palabra + ícono (ver diseño para usuarios grandes).
- **Stack:** el de `## Proyecto` en `CLAUDE.md`. No hay tests todavía: la HU-01 monta el runner (vitest sugerido).
- **Si el servicio falla:** el inicio carga igual, sin la tarjeta o con un texto neutro. Nunca un error.

**Tanda 1 de pendientes (HU-06..09)**
- **Recurso:** la sesión de cada cuenta (estado de aprobación y rol), el workflow que dispara el recordatorio de parte y la página pública del Wrapped.
- **Sesión:** sigue siendo JWT de 90 días; lo que cambia es que la aprobación y el rol se leen de la base en cada petición en vez de confiar en el token. Cómo (callback `jwt`, layout, `requireSession`) se decide en `/story`.
- **Wrapped:** sigue pública a propósito (nivel difusión, para compartir); solo se acota a los años con datos.
- **Recordatorio de parte:** lo dispara GitHub Actions (Vercel Hobby solo admite crons diarios); el workflow ya está escrito en la rama `feat/oficios-seguridad`.
- **Stack:** el de `## Proyecto` en `CLAUDE.md`.

**Tanda 2 de pendientes (HU-10..12)** · M-9 de `pendientes.md`, propuesta del guardia (2026-11-16)
- **Recurso:** el texto que se comparte por WhatsApp desde la app (`src/lib/notificaciones-externas/plantillas.ts`). No cambia la base ni la vista previa del link (Open Graph).
- **Adelanto:** el detalle se corta en palabra entera y sigue con "…"; si el texto ya es corto, va completo y sin "…"; sin detalle, el mensaje queda como hoy. La misma regla para las cuatro plantillas. Cuántas palabras (el guardia propuso 2; se sugirió 4 o 5) se decide en `/story HU-10`.
- **Orden:** HU-10 recorta el aviso, que ya comparte el detalle; HU-11 y HU-12 agregan el adelanto donde hoy no hay descripción. Eso cambia la regla actual de las plantillas ("nunca descripción", `docs/proposal-whatsapp-bridge.md`): sale texto escrito por un vecino fuera de la app.

**Fuera de alcance:** otras ciudades o ubicación por GPS de cada vecino, historial del clima, radar o mapas meteorológicos, alertas oficiales del SMN, configuración de la tarjeta por vecino, guardar datos del clima en la base. De la tanda 1: cerrar sesiones activas a mano o listar dispositivos, acortar los 90 días de la sesión, poner login al Wrapped, mover el recordatorio de parte a otro scheduler. De la tanda 2: los partes de turno (`mensajeParte` sigue completo), la vista previa del link, los oficios, el número de palabras por tipo o configurable.

## ✅ HU-01 · Clima actual en el inicio
Como **vecino** quiero **ver arriba del inicio la temperatura actual y si está soleado, nublado, lloviendo, etc.** para **saber cómo está el día sin salir de la app**.
- Arriba de todo en `/inicio` aparece una tarjeta con la temperatura actual en °C, sin decimales, y el estado del cielo en castellano (Despejado, Parcialmente nublado, Nublado, Niebla, Llovizna, Lluvia, Tormenta, etc.) con su ícono.
- Los datos salen de Open-Meteo para las coordenadas del barrio y se reutilizan por un tiempo fijo, sin pedirlos en cada visita.
- Si Open-Meteo falla o tarda demasiado, `/inicio` responde 200 igual, con el resto de las secciones y sin error visible.
- Incluye el andamiaje: runner de tests instalado, script `npm test` y el primer test en verde.

## ✅ HU-02 · Máxima, mínima y lluvia de hoy
Como **vecino** quiero **ver en la tarjeta la máxima y la mínima del día y la probabilidad de lluvia** para **planear el día (ropa, riego, salir o no)**.
- La tarjeta muestra la máxima y la mínima de hoy en °C y la probabilidad máxima de lluvia del día en %.
- Si la probabilidad de lluvia supera un umbral, se destaca con un texto claro (por ejemplo, "Llevá paraguas").
- Si falta algún dato del día, la tarjeta muestra lo que tiene y no muestra "undefined" ni "NaN".

## ✅ HU-03 · Pronóstico de los próximos días
Como **vecino** quiero **tocar la tarjeta del clima y ver el pronóstico de los próximos 3 días** para **organizar la semana**.
- Al tocar la tarjeta se abre `/clima`, que muestra los próximos 3 días con el nombre del día, el ícono y estado, la máxima, la mínima y la probabilidad de lluvia.
- `/clima` exige sesión: sin sesión, redirige a `/login`.
- Si el servicio falla, `/clima` muestra un mensaje claro ("No pudimos traer el pronóstico, probá más tarde") y un botón para volver al inicio.

- _A refinar:_ `TarjetaClima` hoy pide `forecast_days=1`; el pronóstico necesita más días (¿misma consulta con `forecast_days=4`, o una aparte para `/clima`?). Reusar `estadoDelCielo` y la validación con `Number.isFinite` de HU-02. → Resuelto en `stories/HU-03.md`: consulta propia de `/clima` con `forecast_days=4`.

## ✅ HU-04 · Aviso de clima fuerte en el inicio
Como **vecino** quiero **ver un cartel destacado cuando viene tormenta, granizo, viento fuerte o calor extremo** para **prepararme a tiempo (guardar el auto, entrar cosas, tomar agua)**.
- Si el pronóstico de hoy o de mañana trae tormenta o granizo, ráfagas por encima de un umbral o una máxima por encima de un umbral, el inicio muestra un cartel arriba de la tarjeta con qué viene, cuándo (hoy o mañana) y un consejo práctico.
- Sin clima fuerte en el pronóstico, no hay cartel.
- El cartel no usa el rojo de emergencias: ese color queda para SOS y pánico.

- _A refinar:_ "hoy o mañana" necesita `daily` de al menos 2 días (hoy la tarjeta pide 1) y, para tormenta/granizo/viento, `weather_code` y ráfagas del día. La consulta de `/clima` (HU-03) ya trae 4 días con `weather_code`; faltarían las ráfagas. → Resuelto en `stories/HU-04.md`.

## ✅ HU-05 · Notificación push por clima fuerte
Como **vecino** quiero **recibir una notificación en el celular cuando se espera clima fuerte** para **enterarme aunque no abra la app**.
- Un cron diario (`GET /api/cron/alerta-clima`, con `Authorization: Bearer ${CRON_SECRET}`) revisa el pronóstico con las mismas reglas de HU-04 y, si hay clima fuerte, manda una push a los vecinos suscritos con qué viene y cuándo.
- Sin el token correcto responde 401 y no manda nada.
- No repite la misma alerta para el mismo día aunque el cron corra más de una vez.
- Sin clima fuerte, responde 200 sin mandar push.

- ✅ _Pendiente de HU-04 (cubierto en HU-05: la push usa `climaFuerte`):_ usar las mismas reglas de `src/lib/clima.ts` (umbrales 60 km/h y 38 °C, un solo fenómeno, hoy antes que mañana). El granizo solo llega si el modelo lo informa: la push no puede prometerlo.
- ✅ _Pendiente de HU-04 (cubierto en HU-05: consulta sin caché y fecha del reloj de Córdoba):_ `climaFuerte` rotula "hoy" y "mañana" por posición, sin mirar la fecha. Antes de mandar una push, comparar `daily.time[0]` con la fecha de hoy en Córdoba (pasándola como parámetro, para que `src/lib/clima.ts` siga sin imports de servidor) y decidir qué pasa si falta `time`, o usar una consulta sin caché. La comparación sola no cubre una entrada vieja del mismo día ni un aviso perdido. Ver la nota de seguridad de HU-04 en `## Notas`.

## ✅ HU-06 · Una cuenta desaprobada pierde el acceso
Como **administrador** quiero **que una cuenta que desapruebo deje de entrar en el momento** para **no tener que esperar a que venza su sesión de 90 días**.
- Con la cuenta desaprobada (`verificado: false`), su próxima visita a una página del dashboard la saca a `/login`, aunque tenga un token vigente. _(Refinado en `/story`: va a `/cuenta-no-aprobada`, porque `/login` con token redirige a `/inicio`; ver `stories/HU-06.md`.)_
- Sus pedidos a las APIs que exigen sesión responden 401 y no hacen nada.
- Si se la vuelve a aprobar, puede loguearse y entrar como antes.

## ✅ HU-07 · Un cambio de rol rige en la próxima petición
Como **administrador** quiero **que un cambio de rol se aplique enseguida** para **que alguien a quien le saco permisos no los siga usando con su sesión abierta**.
- Si a un `ADMIN` se le cambia el rol a `VECINO`, su próxima visita a `/admin` ya no lo deja entrar y las APIs de gestión le responden 403.
- Si a un `VECINO` se le da un rol de gestión, lo tiene en su próxima petición, sin volver a loguearse.
- Lo que se muestra según el rol (menú, accesos) usa el rol actual.

## ✅ HU-08 · El recordatorio de parte se dispara solo
Como **guardia** quiero **recibir el recordatorio si no cargué el parte de mi turno** para **no olvidarme de cargarlo**.
- Un workflow de GitHub Actions llama a `GET /api/cron/recordatorio-parte` con `Authorization: Bearer ${CRON_SECRET}` media hora después de cada turno (08:30, 13:30, 18:30 y 23:30 de Argentina).
- Si faltan el secret `CRON_SECRET` o la variable `SITE_URL` del repo, el workflow falla con un mensaje que lo dice.
- Se puede correr a mano (`workflow_dispatch`) para probarlo.

## ✅ HU-09 · El Wrapped responde solo para años con datos
Como **vecino** quiero **compartir el resumen anual del barrio** para **mostrar lo que hace la guardia**, sin que la página pública sirva para cargar la base pidiendo cualquier año.
- `/wrapped/<año>` y `/wrapped/<año>/imagen` responden 200 para los años desde que existe Vecindar hasta el actual, y 404 para el resto (años anteriores, futuros o absurdos).
- Siguen públicas y muestran solo números agregados del barrio.

## ✅ HU-10 · El aviso compartido muestra solo un adelanto del detalle
Como **vecino** quiero **que el aviso que comparto por WhatsApp muestre solo las primeras palabras del detalle** para **que los vecinos entren a la app a leerlo entero**.
- El detalle del aviso sale cortado en las primeras N palabras, en palabra entera, seguido de "…".
- Un detalle de N palabras o menos sale completo y sin "…"; un aviso sin detalle queda como hoy.
- El resto del mensaje no cambia: tipo, 📍 lugar, autor, vencimiento y el link.

## ✅ HU-11 · El incidente compartido lleva un adelanto de la descripción
Como **vecino** quiero **que el incidente que comparto por WhatsApp diga en pocas palabras qué pasó** para **que el grupo sepa de qué se trata y entre a la app a ver el detalle**.
- El mensaje del incidente agrega el adelanto de la descripción (la misma regla de HU-10) entre la línea del autor y el link.
- Sin descripción, el mensaje queda como hoy.
- No sale nada más del incidente: ni ubicación exacta, ni fotos, ni datos de contacto.
- _A refinar:_ (barrido de HU-10) al reutilizar el corte de `plantillaAviso`, la condición tiene que mirar las palabras (`palabras.length > 0`) y no el texto, si la descripción no pasa por `trim`; repetir la amenaza de líneas falsas en el mensaje (un "Avisó…" o un link falsos) sobre esta plantilla, y revisar la descripción junto con la restricción de `visibleVecinos` (`compartir/route.ts:38`). → Resuelto en `stories/HU-11.md`: la plantilla decide por las palabras (CA-3), `visibleVecinos` sigue con 404 (CA-4) y el link falso queda como riesgo aceptado.

## HU-12 · El pedido y la mascota compartidos llevan un adelanto
Como **vecino** quiero **que el pedido y la mascota que comparto por WhatsApp muestren las primeras palabras de la descripción** para **que el grupo sepa de qué se trata y entre a la app**.
- Los mensajes del pedido y de la mascota (perdida y encontrada) agregan el adelanto de la descripción, con la regla de HU-10, entre la línea del autor y el link.
- Sin descripción, cada mensaje queda como hoy.
- No sale nada más: ni ubicación exacta, ni fotos, ni datos de contacto.
- _A refinar:_ (barrido de HU-10) al reutilizar el corte de `plantillaAviso`, la condición tiene que mirar las palabras (`palabras.length > 0`) y no el texto, si la descripción no pasa por `trim`; repetir la amenaza de líneas falsas en el mensaje sobre estas plantillas.
- _Pendiente de HU-11:_ el corte ya es `adelanto()` en `src/lib/notificaciones-externas/plantillas.ts` (decide por las palabras); la excepción de las dos specs del puente (`openspec/changes/whatsapp-bridge/specs/notificaciones-externas/spec.md` y `docs/spec-whatsapp-bridge.md` §4) hoy cubre solo el incidente y hay que ampliarla a pedidos y mascotas.

## Notas
- 2026-11-04 · (HU-05) En el plan Hobby de Vercel los crons son solo diarios: la push sale a una hora fija, así que una tormenta que se forma en el día puede no avisarse a tiempo. Hay que elegir la hora en `/story HU-05`.
- 2026-11-04 · (HU-01) Los datos de Open-Meteo tienen licencia CC BY 4.0, que pide atribución: agregar un "Datos: Open-Meteo" chico en la tarjeta o en `/clima`. Su plan gratis es para uso no comercial; Vecindar cobra suscripción. Resuelto en HU-01: atribución en la tarjeta y plan gratis por ahora, con `OPEN_METEO_URL`/`OPEN_METEO_API_KEY` listas para pasar al plan comercial. **Pendiente:** decidir cuándo contratarlo.
- 2026-11-04 · (HU-01) `npm install` informa vulnerabilidades en `npm audit`; no se revisaron.
- 2026-11-04 · (HU-01) vitest quedó en 4.x porque vitest 5 pide `@types/node` ≥22 y el repo tiene 20 (Node local 22). Subir `@types/node` a ^22 destraba vitest 5.
- 2026-11-04 · (HU-01) Hardening de la tarjeta del clima (la temperatura no finita se resuelve en HU-02): `encodeURIComponent` sobre `OPEN_METEO_API_KEY` en la URL; rechazar `http://` en `OPEN_METEO_URL` (la key viajaría en claro); un test que fije que la URL (con la key) no se loguea; validar `typeof weather_code === "number"`.
- 2026-11-04 · (HU-02) I-5 (`TarjetaClima.test.tsx`) prohíbe los textos de una muestra de estados, entre ellos "Lluvia"; choca con la etiqueta "Lluvia" del bloque del día. Hoy no falla (I-5 no trae `daily`), pero un test con código desconocido y `daily` lo rompería: conviene que I-5 mire la línea del estado, no todo el HTML.
- 2026-11-04 · (HU-02) Si `daily` existe pero faltan Máx, Mín y Lluvia a la vez, la tarjeta pinta un `<p>` vacío (sin texto visible). Ningún criterio lo pide; ajustar si molesta.
- 2026-11-04 · (HU-02) Hardening de los datos del día: la lluvia no se acota a [0, 100] ni se redondea (`1e300` → "Lluvia 1e+300%" y activa el paraguas); máxima/mínima absurdas (`1e21`) salen en notación exponencial. Open-Meteo real no lo manda.
- 2026-11-05 · (HU-03) `/clima` no valida cada fecha de `daily.time`: `nombreDelDia(null)` da "Jueves 1" y `nombreDelDia("x")` da "Invalid Date". Open-Meteo real no debería mandarlo. Si se corrige, tratarlo como "sin fechas" (mensaje de error).
- 2026-11-05 · (HU-03) Riesgo aceptado, deducido y no reproducido: con `revalidate: 1800`, una respuesta guardada antes de medianoche puede servirse hasta 30 min después, y entonces `/clima` rotula hoy como "Mañana". Evitarlo pide comparar con la fecha actual en Córdoba, o sea, volver a usar el reloj del servidor.
- 2026-11-05 · (HU-03) El hardening de `OPEN_METEO_API_KEY` y `OPEN_METEO_URL` anotado en HU-01 ahora aplica en dos sitios: `TarjetaClima.tsx` y `clima/page.tsx`.
- 2026-11-05 · (seguridad, sospecha sin confirmar) `login/page.tsx:9,37` hace `router.push(callbackUrl || "/inicio")` sin exigir mismo origen, y `registro/page.tsx:62,150` lo propaga. Falta comprobar qué hace `router.push` con una URL externa o con otro esquema.
- 2026-11-05 · (seguridad) Confirmado en el código de la librería: `proxy.ts:25-30` llama a `getToken` sin `secureCookie`, así que busca `authjs.session-token`, mientras que con `https:` Auth.js emite `__Secure-authjs.session-token`, y `src/lib/auth.ts` no fija `useSecureCookies` ni `cookies`. Si producción sirve por https, el proxy mandaría a `/login` a vecinos con sesión (falla cerrado: es disponibilidad, no un bypass). Falta mirar qué cookie emite producción.
- 2026-11-05 · (seguridad, hardening) El bloqueo de prueba vencida está solo en el layout (`layout.tsx:54-55`), no en cada página. Falta comprobar si una navegación RSC reejecuta el layout. En `/clima` no importa porque son datos públicos, pero sí en páginas con datos de vecinos.
- 2026-11-05 · (HU-04, seguridad, needs_validation) El cartel del inicio rotula "hoy" y "mañana" por posición y nadie compara `daily.time` con la fecha real. Con el manejador de caché por defecto de Next, una entrada vencida se sirve sin edad máxima mientras revalida en segundo plano, y solo se guardan respuestas 200: con Open-Meteo caído seguiría saliendo un "Tormenta hoy" viejo, y el tope de 30 min aceptado en HU-03 y HU-04 no se sostendría. No hace falta la caída: la primera visita después de horas sin tráfico también recibe la entrada vieja, y la caída solo lo alarga. Un test que lo reproduzca tiene que traer `current.temperature_2m` finita: sin ella la tarjeta sale por el `catch` y el verde no prueba nada. Comparar `daily.time` con la fecha real no alcanza por sí solo: una entrada de la mañana servida a la tarde del mismo día pasa la comparación, y un aviso perdido sigue perdido; para eso hace falta una consulta sin caché o con edad acotada. Que `next.config.ts` no declare `cacheHandler` no significa que se use el manejador por defecto. Falta validar en Vercel si inyecta su propio `FetchCache`, si sirve entradas vencidas mientras la revalidación falla y con qué edad máxima. Si se confirma, ocultar solo el cartel deja igual la temperatura, Máx, Mín y Lluvia viejos, y `/clima` rotula "Mañana" por posición con la misma caché.
- 2026-11-05 · (HU-04, seguridad, hardening) La consulta de la tarjeta no fija `wind_speed_unit=kmh` y no lee `daily_units`: el umbral de 60 depende del valor por defecto de la API. `clima.ts:67` acepta códigos no enteros como 95.5. La revalidación en segundo plano corre sin el timeout de 3 s, porque Next quita el `signal`. El `fetch` de la tarjeta sigue redirecciones (sin `redirect: "error"`): el proveedor podría hacer que el servidor pida otra URL, aunque de esa respuesta solo se usarían campos de clima.
- 2026-11-05 · (HU-04) Los umbrales del cartel (60 km/h y 38 °C) son fijos y no se validaron con datos del barrio. Quedó fuera de HU-04: revisarlos si el cartel sale de más o de menos.
- 2026-11-07 · (HU-05, seguridad, hardening) Cron `/api/cron/alerta-clima`: compara el token con `!==` y no en tiempo constante (igual que los otros crons); mete `OPEN_METEO_API_KEY` en la URL sin `encodeURIComponent`; `res.json()` no limita el tamaño del cuerpo (dentro de los 5 s); loguea el error completo de Prisma y de la push (podría traer datos de conexión). Los previews de Vercel comparten la DB de prod: si un preview tiene `CRON_SECRET` (y otro `OPEN_METEO_URL`), quien tenga ese secreto puede gastar el aviso del día de producción o mandar la push desde el preview (needs_validation: depende de la config de entornos en Vercel).
- 2026-11-07 · (HU-05) Quedó fuera de la push de clima: avisar una tormenta que se forma después de las 8 (Hobby: un cron diario); elegir por vecino si recibe esta push; reintentar un envío fallido o volver a avisar si el pronóstico cambia en el día; limpiar las filas viejas de `alertas_clima` (una por día con alerta).
- 2026-11-09 · (HU-06, seguridad) Un usuario borrado de la base que conserva un JWT vigente no queda afuera: el layout del dashboard y el guard de las APIs comparan `cuenta?.verificado === false`, y con la cuenta inexistente (`null`) dejan pasar; `/cuenta-no-aprobada` lo manda a `/inicio`. Pasaba igual antes de HU-06. Falta ver si las rutas fallan después al buscar al usuario, o si conviene tratar "no existe" como desaprobada.
- 2026-11-10 · (HU-06, seguridad, hardening) El layout del dashboard llama a `registrarActividad` antes de mirar `verificado` (`layout.tsx:33` vs `:50`): una cuenta desaprobada que carga una página sigue actualizando su última actividad, a diferencia de las APIs (CA-3). No afecta a otros usuarios; solo ensucia las métricas de actividad.
- 2026-11-13 · (HU-07, seguridad, hardening) El callback `jwt` de `src/lib/auth.ts` consulta el rol con `Number(token.id)` sin comprobar que sea un entero positivo; `parseId` de `src/lib/api/guard.ts:23` lo haría explícito. Hoy nadie puede aprovecharlo (el token va firmado). Además, el `catch` no distingue un corte de la base de un error de programación: los dos conservan el rol del token.
- 2026-11-16 · (HU-07) Quedó fuera de HU-07: el callback `jwt` solo refresca el rol; nombre, email y lote del token siguen con el valor del login hasta volver a loguearse. Tampoco se cachea la lectura del rol: es una consulta por cada `auth()`. Revisarlo si la carga de la base lo pide.
- 2026-11-16 · (HU-08) `GET /api/cron/recordatorio-parte` y `turnoRecienTerminado` (`src/lib/partes.ts:178`) no tienen tests propios: HU-08 solo fija las 4 horas del cron contra la ventana. Faltan los casos de la ruta (401, "ya cargado", push a `SEGURIDAD` aprobados con el `tag` por turno) y los bordes de la ventana (fin exacto, +3 hs, el turno noche después de medianoche).
- 2026-11-16 · (HU-08, seguridad, hardening) Workflow `recordatorio-parte.yml`: no exige que `SITE_URL` sea `https://` (con `http://` el Bearer viaja en claro; se puede rechazar en la misma condición del `::error::`, pero rompe una prueba local contra `http://localhost`); el JSON del endpoint (turno, `destinatarios`) queda en el log de cada corrida, visible para cualquiera si el repo es público (`-o /dev/null` lo evita, a costa del diagnóstico); quien tiene escritura en el repo puede empujar un workflow modificado a otra rama y exfiltrar `CRON_SECRET` con `workflow_dispatch` (la defensa es un `environment` protegido en GitHub); `CRON_SECRET` es uno solo para todos los `/api/cron/*` (ver S-6 y S-7 de `pendientes.md`).
- 2026-11-16 · (HU-08, seguridad, hardening) En `recordatorio-parte.yml`, `"$SITE_URL/api/cron/recordatorio-parte"` va a curl como argumento posicional: si `SITE_URL` empezara con `-`, curl lo tomaría como opción. Solo lo fija un administrador del repo; `--url "$SITE_URL/…"` lo cierra.
- 2026-11-16 · (HU-09) El Wrapped de un año ya cerrado se recalcula en cada visita (12 consultas en `construirWrapped`). Con el rango acotado es 1 año por petición válida; si el tráfico lo pide, cachearlo (por ejemplo `revalidate` en las dos rutas para los años cerrados).
- 2026-11-16 · (HU-09) `construirWrapped` (`src/lib/crecimiento/wrapped.ts`) no tiene tests contra la base: HU-09 la mockea y solo fija el rango de años. Las 12 consultas y las métricas que arma quedan sin cubrir.
- 2026-11-17 · (HU-10, seguridad, hardening) El adelanto de `plantillaAviso` (`src/lib/notificaciones-externas/plantillas.ts:76`) separa con `split(/\s+/)`, que no corta en U+0085 (NEL) ni en los caracteres de ancho cero (U+200B…U+200D, U+2060): con ellos un detalle largo cuenta como una sola palabra y sale completo, o queda un salto visual dentro del adelanto si WhatsApp dibuja el NEL. Es texto del propio autor, que antes salía entero. El detalle hecho solo de espacios ya no deja una línea vacía: desde HU-11 el aviso decide por las palabras (U-57). Desde HU-11 el corte es `adelanto()`, compartido por el aviso y el incidente: los huecos de NEL y ancho cero valen para las dos plantillas, y tampoco se neutralizan las marcas de formato de WhatsApp (`*`, `_`, `~`, ```` ``` ````) ni los controles de dirección (U+202E y similares) dentro del adelanto (cambian cómo se ve esa línea, pero no llegan a otra línea ni al link real).
- 2026-11-17 · (HU-10) `src/lib/notificaciones-externas/plantillas.ts` no cumple prettier desde antes de HU-10 (`npx prettier --check` avisa en `main`); no se reformateó para no mezclarlo con la historia.
- 2026-11-17 · (HU-10, seguridad) `POST /api/avisos` (`src/app/api/avisos/route.ts:44`) arma el cuerpo de la push con `ubicacion — detalle` sin colapsar los saltos de línea del detalle (recortado a 140 caracteres). Es otro canal que el de HU-10; revisar si la push tiene que seguir la misma regla de una sola línea.
- 2026-11-17 · (HU-11, seguridad, hardening) El adelanto del aviso y del incidente (`plantillas.ts`) deja pasar links: una descripción de pocas palabras como "Ver detalle 👉 https://otro.sitio" sale completa, justo arriba del link real del mensaje. Aceptado en HU-11 (el autor es un vecino aprobado y queda identificado en el mensaje). Si se quiere cerrar: cortar el adelanto antes de la primera palabra con `://` o `www.`, en las dos plantillas.
- 2026-11-17 · (HU-11, seguridad) Un incidente visible marcado `FALSA_ALARMA` o `RESUELTO` se sigue pudiendo compartir: `resolverIncidente` (`src/app/api/notificaciones-externas/compartir/route.ts:21-41`) no mira `estado`. Con HU-11 eso incluye el adelanto de la descripción, que puede nombrar a alguien o una casa en un incidente que el barrio ya dio por falso. Ninguna spec lo prohíbe; decidir si compartir se corta por estado.
- 2026-11-17 · (HU-11) `src/app/api/notificaciones-externas/compartir/route.ts` no cumple prettier desde antes de HU-11 (`npx prettier --check` avisa en `main`), igual que `plantillas.ts`; no se reformateó para no mezclarlo con la historia.
- 2026-11-17 · (HU-11, seguridad) Dentro de la app, un incidente con `visibleVecinos: false` lo ven también REFERENTE_MANZANA y TESORERO: `src/app/api/incidentes/[id]/route.ts:44` y `src/app/(dashboard)/incidentes/[id]/page.tsx:49` solo bloquean al rol VECINO. Compartirlo por WhatsApp sí está bloqueado para todos los roles (I-128). Decidir qué roles ven un incidente restringido.
