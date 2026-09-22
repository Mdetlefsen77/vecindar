# Proposal

## Why

La adopción real de Vecindar es baja: los vecinos siguen reportando y conversando en el grupo de WhatsApp de seguridad del barrio porque ya está instalado, ya está logueado y no requiere aprender nada nuevo. En vez de competir contra WhatsApp, se lo usa como canal de distribución — que los eventos cargados en la app (incidentes, requerimientos, mascotas perdidas) aparezcan como un aviso breve en el grupo, deliberadamente incompleto, que obliga a abrir Vecindar para enterarse del detalle. Este change cubre la validación de esa hipótesis con el menor riesgo posible: publicación **semi-manual** (un gestor comparte con un botón, no una integración automática), sin tocar Términos de Servicio de WhatsApp y sin infraestructura nueva. Ver `docs/spec-whatsapp-bridge.md` y `docs/proposal-whatsapp-bridge.md` para el análisis completo — hipótesis, restricciones técnicas (incluye por qué la API oficial de Meta no sirve para esto) y las decisiones de producto ya resueltas por el dueño (D1–D8).

## What Changes

- Nueva capacidad `notificaciones-externas`: links rastreables (`/r/[codigo]`) con atribución de clicks y de origen de registro — entrega valor por sí sola para cualquier canal de difusión futuro, no solo WhatsApp.
- Acción "Compartir en el grupo" en el detalle de un incidente/requerimiento/mascota, visible solo para quien ya gestiona ese tipo de entidad (reutiliza `GESTORES_INCIDENTES`/`GESTORES_REQUERIMIENTOS`/`GESTORES_MASCOTAS` existentes, sin rol nuevo en esta fase): genera el link rastreable, arma el mensaje "teaser" con la plantilla centralizada y abre WhatsApp vía deep link (`wa.me`) para que la persona lo pegue manualmente en el grupo.
- Registro de qué se compartió, por quién y cuándo (para no compartir dos veces y para medir), y métricas de CTR / clicks sin sesión / conversión a registro en el panel de admin.
- Ajuste al flujo de login/registro: preservar el destino original cuando se llega desde un link externo (`/r/[codigo]` → detalle) y mostrar una pantalla de contexto a quien no tiene cuenta, en vez de un 401 o un login pelado.
- **Explícitamente fuera de alcance de este change** (ver `docs/proposal-whatsapp-bridge.md` §12): publicación automática (outbox + cron + proveedor externo — eso es Fase 2, un change separado y condicionado al resultado de este), adjuntar imágenes al mensaje, puente bidireccional, kill switch / configuración por admin (no hace falta sin automatización).

## Capabilities

### New Capabilities
- `notificaciones-externas`: links rastreables con atribución de clicks/registro, y publicación semi-manual de eventos de dominio (incidente, requerimiento, mascota perdida) hacia un canal externo, con plantillas de mensaje centralizadas y permisos vía `permisos.ts`.

### Modified Capabilities
Ninguna — el proyecto no tiene specs previas registradas en OpenSpec (`openspec list --specs` no devuelve nada). Los módulos de incidentes/requerimientos/mascotas se tocan a nivel de implementación (nueva acción de compartir, nuevo enganche de link rastreable) pero no cambian ningún requisito de comportamiento existente de esos módulos.

## Impact

- **Prisma schema**: nuevos modelos `PublicacionExterna` (solo `modo = MANUAL` en esta fase), `LinkRastreable`, `ClickLink`, y campo `Usuario.origenRegistro`. Migración aditiva, sin tocar tablas existentes. `ConfigPuenteExterno` (kill switch, ventana horaria) queda diferido a la Fase 2 — no hace falta sin despacho automático.
- **Rutas**: nueva ruta pública `GET /r/[codigo]`; nueva acción "Compartir" en las vistas de detalle de incidente/requerimiento/mascota; pantalla intermedia de contexto para usuario sin cuenta en el flujo de login.
- **Permisos**: sin roles nuevos — reutiliza los conjuntos `GESTORES_*` existentes por tipo de entidad.
- **`src/proxy.ts`**: sin cambios de código esperados (ya preserva `callbackUrl`); el flujo de NextAuth alrededor de login/registro sí se extiende.
- No afecta cobranza, push nativo existente, ni ningún otro módulo — es aditivo y no reemplaza nada.
