import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { enviarPushUsuario } from "@/lib/push/enviarPush";

// POST /api/push/test — envía una notificación de prueba al usuario actual.
// Sirve para diagnosticar en producción: confirma que hay una suscripción
// registrada para este dispositivo y que las VAPID keys del entorno funcionan.
// Si no llega la notificación pese a un 200 acá, el problema está en las
// VAPID keys del servidor o en que el navegador descartó la suscripción.
export async function POST() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const usuarioId = getUserId(session);

  const suscripciones = await prisma.pushSubscription.count({
    where: { usuarioId },
  });

  if (suscripciones === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No hay ninguna suscripción push registrada para tu usuario. " +
          "Activá las notificaciones desde el menú.",
      },
      { status: 404 },
    );
  }

  await enviarPushUsuario(usuarioId, {
    title: "🔔 Notificación de prueba",
    body: "Si ves esto, las notificaciones funcionan en este dispositivo.",
    url: "/inicio",
    tag: "push-test",
  });

  return NextResponse.json({ ok: true, suscripciones });
}
