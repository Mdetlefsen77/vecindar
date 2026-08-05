import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession } from "@/lib/api/guard";
import {
    suscripcionPushSchema,
    eliminarSuscripcionPushSchema,
} from "@/lib/validation/push";

// POST /api/push/subscribe — registra o actualiza la suscripción del dispositivo
export async function POST(req: NextRequest) {
    const guard = await requireSession();
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await req.json();
    const parsed = suscripcionPushSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos de suscripción inválidos." },
            { status: 400 },
        );
    }

    const { endpoint, keys } = parsed.data;

    const usuarioId = parseInt(session.user.id!);

    // Upsert por endpoint — si ya existe, actualiza; si no, crea
    await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh: keys.p256dh, auth: keys.auth, usuarioId },
        create: {
            usuarioId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
        },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/push/subscribe — elimina la suscripción del dispositivo actual
export async function DELETE(req: NextRequest) {
    const guard = await requireSession();
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await req.json();
    const parsed = eliminarSuscripcionPushSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Endpoint requerido." }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
        where: {
            endpoint: parsed.data.endpoint,
            usuarioId: parseInt(session.user.id!),
        },
    });

    return NextResponse.json({ ok: true });
}
