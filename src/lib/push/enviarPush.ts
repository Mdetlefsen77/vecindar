import webpush from "web-push";
import { prisma } from "@/lib/prisma/client";

interface PushPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
}

/**
 * Envía una notificación push a todos los ADMIN y SEGURIDAD suscritos.
 * Las suscripciones expiradas o inválidas se eliminan automáticamente.
 */
export async function enviarPushAdmins(payload: PushPayload): Promise<void> {
    // Inicializar web-push aquí (runtime) para evitar errores durante el build
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? "mailto:admin@vecindar.app",
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
    );

    const suscripciones = await prisma.pushSubscription.findMany({
        where: {
            usuario: {
                rol: { in: ["ADMIN", "SEGURIDAD"] },
            },
        },
    });

    if (suscripciones.length === 0) return;

    const resultados = await Promise.allSettled(
        suscripciones.map((sub) =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
}
