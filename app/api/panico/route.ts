import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// GET /api/panico
// Admin: todas las alertas (activas primero, luego cerradas recientes)
// Vecino: solo sus propias alertas activas
export async function GET(_req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const esAdmin =
        session.user.role === "ADMIN" ||
        session.user.role === "SEGURIDAD";

    const alertas = await prisma.alertaPanico.findMany({
        where: esAdmin
            ? {} // admin ve todo
            : { usuarioId: parseInt(session.user.id!) }, // vecino solo las suyas
        include: {
            usuario: {
                select: {
                    nombre: true,
                    telefono: true,
                    lote: {
                        select: {
                            numero: true,
                            manzana: { select: { numero: true, zona: true } },
                        },
                    },
                },
            },
            atendioPor: { select: { nombre: true } },
        },
        orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
        take: esAdmin ? 50 : 10,
    });

    return NextResponse.json(alertas);
}

// POST /api/panico — crear nueva alerta de pánico
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    // Bloquear si ya tiene una alerta activa
    const activa = await prisma.alertaPanico.findFirst({
        where: {
            usuarioId: parseInt(session.user.id!),
            estado: { in: ["ENVIADO", "RECIBIDO", "EN_ATENCION"] },
        },
    });

    if (activa) {
        return NextResponse.json(
            { error: "Ya tenés una alerta activa.", alerta: activa },
            { status: 409 }
        );
    }

    const body = await req.json();
    const { latitud, longitud } = body as { latitud: number; longitud: number };

    if (typeof latitud !== "number" || typeof longitud !== "number") {
        return NextResponse.json(
            { error: "Se requieren coordenadas de ubicación." },
            { status: 400 }
        );
    }

    const alerta = await prisma.alertaPanico.create({
        data: {
            usuarioId: parseInt(session.user.id!),
            latitud,
            longitud,
            estado: "ENVIADO",
        },
        include: {
            usuario: {
                select: {
                    nombre: true,
                    lote: {
                        select: {
                            numero: true,
                            manzana: { select: { numero: true } },
                        },
                    },
                },
            },
        },
    });

    return NextResponse.json(alerta, { status: 201 });
}
