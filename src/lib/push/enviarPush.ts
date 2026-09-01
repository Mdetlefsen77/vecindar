import webpush from "web-push";
import { prisma } from "@/lib/prisma/client";
import { GESTORES_PANICO, GESTORES_USUARIOS } from "@/lib/permisos";
import type { Prisma } from "@/generated/client";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Notificación persistente que no se auto-descarta (usar solo para SOS). */
  requireInteraction?: boolean;
  /** "SOS" dispara el popup + alarma sonora en la pestaña abierta (ver SosAlertListener). */
  tipo?: "SOS";
}

type Suscripcion = { endpoint: string; p256dh: string; auth: string };

// Configurar web-push una sola vez por proceso. Se hace de forma perezosa (no a
// nivel de módulo) para no romper el build si las VAPID keys no están presentes
// en tiempo de compilación.
let vapidConfigurado = false;

function configurarVapid(): void {
  if (vapidConfigurado) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@vecindar.app",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidConfigurado = true;
}

/**
 * Envía un payload a un conjunto ya resuelto de suscripciones.
 * Elimina automáticamente las suscripciones vencidas o inválidas (410/404).
 */
async function enviarASuscripciones(
  suscripciones: Suscripcion[],
  payload: PushPayload,
): Promise<void> {
  if (suscripciones.length === 0) return;

  // Todo el cuerpo va en try/catch: estas funciones se llaman con `void` desde
  // los route handlers (envío en background, no debe bloquear la respuesta), así
  // que un throw acá se convertiría en un unhandled rejection — típicamente por
  // VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY mal configuradas en el entorno.
  try {
    configurarVapid();

    const resultados = await Promise.allSettled(
      suscripciones.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        ),
      ),
    );

    // Limpiar suscripciones inválidas (HTTP 410 = expiradas, 404 = no encontradas)
    const expiradas: string[] = [];
    resultados.forEach((result, i) => {
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiradas.push(suscripciones[i].endpoint);
        }
      }
    });

    if (expiradas.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiradas } },
      });
    }
  } catch (err) {
    console.error("Error enviando push notifications:", err);
  }
}

/** Envía una notificación push a todos los ADMIN y SEGURIDAD suscritos. */
export async function enviarPushAdmins(payload: PushPayload): Promise<void> {
  const suscripciones = await prisma.pushSubscription.findMany({
    where: { usuario: { rol: { in: [...GESTORES_PANICO] } } },
  });
  await enviarASuscripciones(suscripciones, payload);
}

/**
 * Envía una notificación push solo a los ADMIN suscritos (ej: nuevo registro
 * pendiente de aprobación — a diferencia de enviarPushAdmins, SEGURIDAD no
 * gestiona usuarios, así que no la recibe).
 */
export async function enviarPushSoloAdmin(payload: PushPayload): Promise<void> {
  const suscripciones = await prisma.pushSubscription.findMany({
    where: { usuario: { rol: { in: [...GESTORES_USUARIOS] } } },
  });
  await enviarASuscripciones(suscripciones, payload);
}

/** Envía una notificación push a un único usuario (ej: respuesta a su requerimiento). */
export async function enviarPushUsuario(
  usuarioId: number,
  payload: PushPayload,
): Promise<void> {
  const suscripciones = await prisma.pushSubscription.findMany({
    where: { usuarioId },
  });
  await enviarASuscripciones(suscripciones, payload);
}

/**
 * Envía una notificación push a todos los usuarios suscritos (vecinos incluidos),
 * excluyendo opcionalmente a quien generó el evento (para no notificarse a sí mismo).
 */
export async function enviarPushBroadcast(
  payload: PushPayload,
  excluirUsuarioId?: number,
): Promise<void> {
  const where: Prisma.PushSubscriptionWhereInput = excluirUsuarioId
    ? { usuarioId: { not: excluirUsuarioId } }
    : {};

  const suscripciones = await prisma.pushSubscription.findMany({ where });
  await enviarASuscripciones(suscripciones, payload);
}
