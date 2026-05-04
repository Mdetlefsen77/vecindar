import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// Solo ADMIN y SEGURIDAD pueden suscribirse a push notifications
function esAdminOSeguridad(role: string | undefined) {
    return role === "ADMIN" || role === "SEGURIDAD";
}

// POST /api/push/subscribe — registra o actualiza la suscripción del dispositivo
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !esAdminOSeguridad(session.user.role)) {
        return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }

    const body = await req.json();
    const { endpoint, keys } = body as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json(
            { error: "Datos de suscripción inválidos." },
            { status: 400 },
        );
    }

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
    const session = await auth();
    if (!session?.user || !esAdminOSeguridad(session.user.role)) {
        return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }

    const body = await req.json();
    const { endpoint } = body as { endpoint: string };

    if (!endpoint) {
        return NextResponse.json({ error: "Endpoint requerido." }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
        where: {
            endpoint,
            usuarioId: parseInt(session.user.id!),
        },
    });

    return NextResponse.json({ ok: true });
}
