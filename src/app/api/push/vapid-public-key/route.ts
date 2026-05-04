import { NextResponse } from "next/server";

// GET /api/push/vapid-public-key
// Expone la clave pública VAPID al cliente para registrar suscripciones
export async function GET() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return NextResponse.json(
            { error: "VAPID no configurado." },
            { status: 500 },
        );
    }
    return NextResponse.json({ publicKey });
}
