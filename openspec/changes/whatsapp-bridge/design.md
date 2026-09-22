# Design

## Context

Ver `proposal.md` para la motivación. Contexto técnico relevante (ver `docs/proposal-whatsapp-bridge.md` para el análisis completo que sustenta estas decisiones):

- El proyecto usa Prisma 7 (`generator client`, imports desde `@/generated/*`), convención de dominio en español, y una matriz central de permisos en `src/lib/permisos.ts` (`GESTORES_*` + `esGestor()`) — nunca checks de rol inline.
- `src/proxy.ts` ya preserva `callbackUrl` en el redirect a `/login` para rutas protegidas sin sesión.
- Existe `src/lib/api/rateLimit.ts` (en memoria, por instancia — no un límite global en serverless con múltiples instancias) y `src/lib/push/enviarPush.ts` con funciones ya armadas para notificar a conjuntos de roles.
- No hay API oficial de WhatsApp que permita publicar en el grupo real del barrio (más de 8 participantes, sin endpoint para unirse a un grupo existente) — por eso este change es deliberadamente manual, no una integración.

## Goals / Non-Goals

**Goals:**
- Infraestructura de links rastreables reutilizable para cualquier canal de difusión, no solo WhatsApp.
- Que un gestor pueda compartir un evento hacia WhatsApp con el mínimo de fricción y sin exponer datos sensibles.
- Que llegar desde un link externo sin cuenta lleve a un flujo de registro con contexto, no a un error.
- Medir CTR, clicks sin sesión y conversión a registro para decidir si vale la pena automatizar (Fase 2).

**Non-Goals:**
- Despacho automático (outbox, cron, reintentos, proveedor externo) — pertenece a un change de Fase 2, condicionado al resultado de este.
- Panel de configuración / kill switch por tipo de evento — solo tiene sentido cuando hay algo que apagar automáticamente.
- Cualquier tratamiento especial de alertas de pánico (`AlertaPanico`) — la acción de compartir de este change no incluye ese tipo de evento.
- Adjuntar imágenes, ubicación exacta o datos de contacto en el mensaje compartido, bajo ninguna circunstancia.

## Decisions

### El código del link no es el id de la entidad
**Decisión:** el link rastreable usa un código aleatorio de 8 caracteres (no enumerable), separado del id de la entidad compartida, con su propia fila en la base que apunta a la URL real de destino.
**Alternativa descartada:** usar el id del incidente/requerimiento directamente en la URL — más simple, pero permite enumerar contenido de la comunidad (`/incidentes/1`, `/incidentes/2`, ...) y no deja un punto único para medir clicks.

### Vista previa vía interstitial con metarefresh, no detección de user-agent
**Decisión:** `/r/[codigo]` siempre responde el mismo HTML: metatags Open Graph genéricos (o por tipo de evento, nunca con contenido del evento) más una redirección inmediata del lado del cliente (`meta http-equiv="refresh"` o equivalente) hacia la URL real. Un crawler de vista previa lee las metatags y no ejecuta la redirección; un navegador real la ejecuta al instante.
**Por qué esto y no lo que sugería la propuesta técnica inicial (detección de user-agent):** no depende de que el string de user-agent del crawler de WhatsApp matchee un patrón conocido, que puede cambiar sin aviso. Un único response sirve a los dos casos por construcción, en vez de una rama condicional que puede fallar silenciosamente si el patrón no matchea. Igual hay que verificarlo empíricamente contra el grupo real antes de dar por cerrada Fase 0 (primera tarea de `tasks.md`) — lo que cambia es que el fallback ante un comportamiento inesperado de WhatsApp es más simple de diagnosticar (inspeccionar el HTML servido) que ante detección de UA.

### Reutilizar los conjuntos de gestores existentes para la acción de compartir
**Decisión:** la acción "Compartir" en el detalle de un incidente/requerimiento/mascota se gatea con el mismo conjunto de roles que ya gestiona esa entidad (`GESTORES_INCIDENTES`, `GESTORES_REQUERIMIENTOS`, `GESTORES_MASCOTAS`), sin un rol nuevo.
**Alternativa descartada:** un conjunto único `GESTORES_INTEGRACIONES` para toda acción relacionada con el puente externo — se descarta para esta fase porque no hay todavía una superficie de configuración transversal que lo justifique (eso es Fase 2, con el kill switch); mezclar los dos ejes ahora obligaría a mantenerlos sincronizados sin necesidad.

### El link no bypasea la visibilidad vigente del evento
**Decisión:** la redirección de `/r/[codigo]` apunta siempre a la ruta real del evento (`/incidentes/[id]`, etc.), y es esa ruta la que decide si mostrar el contenido según las reglas de visibilidad vigentes en el momento del click — no en el momento en que se compartió.
**Por qué:** esas reglas ya existen (`visibleVecinos` + rol) y ya se re-evalúan en cada request. Duplicar esa lógica en el link rastreable sería una segunda fuente de verdad que puede desincronizarse. Lo único nuevo a construir es que la página de destino muestre un estado legible ("este contenido ya no está disponible") en vez de propagar el error crudo cuando esas reglas bloquean el acceso.

### Deep link `wa.me`, no Web Share API
**Decisión:** el botón "Compartir" arma la URL `https://wa.me/?text=...` con el mensaje pre-cargado. La persona elige el grupo destino desde su propia lista de chats de WhatsApp.
**Alternativa descartada:** Web Share API — es mobile-only, agrega una rama de UI a mantener y testear, y no resuelve nada que `wa.me` no resuelva ya (ninguna de las dos puede preseleccionar el grupo destino: eso lo sigue eligiendo la persona). Queda como mejora futura opcional, no como parte de este change.

### Rate limiting: se acepta el límite conocido del `rateLimit()` existente
**Decisión:** `/r/[codigo]` usa `rateLimit()` (en memoria, por IP) tal como está, sin migrar a un contador en base de datos.
**Por qué:** para el volumen esperado de un PoC de un barrio, el límite real más alto que el nominal (por tener múltiples instancias serverless) es aceptable. `ClickLink` ya deja una base para un contador exacto en base de datos si el tráfico lo justifica más adelante, sin rediseño.

### Modelo de datos preparado para Fase 2 sin construir Fase 2
**Decisión:** `PublicacionExterna` incluye desde ahora el campo `modo` (`MANUAL` | `AUTOMATICA`) y `estado`, aunque en este change el único valor de `modo` que se usa es `MANUAL` y el único `estado` alcanzable es `ENVIADA` (se marca al momento de compartir, no hay reintentos ni pendientes).
**Por qué:** evita una migración de schema para agregar estos campos si Fase 2 se aprueba — el costo de tenerlos desde ahora es una columna sin usar, no una migración futura sobre una tabla con datos.

## Risks / Trade-offs

- **[Riesgo] El mecanismo de vista previa (interstitial + metarefresh) no se comportó como se espera al probarlo contra WhatsApp real** → Mitigación: es la primera tarea de `tasks.md`, antes de construir el resto del flujo de compartir; si falla, el fallback es investigar el comportamiento observado (inspeccionar qué pide el crawler) en vez de asumir una solución alternativa de antemano.
- **[Riesgo] Alguien reenvía o hace captura del link fuera del grupo antes de que el evento deje de ser visible** → Mitigación: aceptado como límite conocido, coherente con que WhatsApp es "un espacio menos controlado que la app" (§8.1 de la spec funcional) — el contenido detrás del link sigue las mismas reglas de visibilidad que el resto de la app, no hay forma de revocar algo ya reenviado.
- **[Riesgo] El límite de `rateLimit()` en memoria no frena un scraping deliberado de códigos si el tráfico crece** → Mitigación: aceptado para el volumen de un PoC de un barrio; revisar si el tráfico de Fase 1 lo justifica antes de Fase 2.
- **[Trade-off] Sin outbox ni cola, "compartir" es una operación síncrona** → Aceptado: no hay proveedor externo al que llamar en este change (WhatsApp lo abre el propio gestor), así que no hay razón para asincronía todavía.

## Migration Plan

Migración de Prisma única y aditiva (`PublicacionExterna`, `LinkRastreable`, `ClickLink`, `Usuario.origenRegistro`), sin tocar tablas existentes ni requerir backfill. Se puede desplegar de forma incremental: el schema y la ruta `/r/[codigo]` pueden existir sin que la acción "Compartir" esté visible todavía (se agrega al final), y nada de lo existente depende de estos cambios. No hace falta feature flag ni rollback especial más allá de revertir el PR.

## Open Questions

- Copy exacto de cada plantilla de mensaje — se puede iterar después de la primera semana de uso sin cambiar el requisito de que las plantillas excluyan datos sensibles.
- Si conviene agregar Web Share API como mejora progresiva en mobile más adelante — no cambia el alcance de este change.
