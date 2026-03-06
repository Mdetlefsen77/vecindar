import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { type TipoAlertaMascota } from "@prisma/client";

// GET /api/mascotas?tipo=PERDIDA|ENCONTRADA&estado=abierta|resuelta
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo") as TipoAlertaMascota | null;
    const estado = searchParams.get("estado"); // "abierta" | "resuelta" | null

    const mascotas = await prisma.mascotaPerdida.findMany({
        where: {
            ...(tipo ? { tipo } : {}),
            ...(estado === "abierta" ? { estado: true } : {}),
            ...(estado === "resuelta" ? { estado: false } : {}),
        },
        include: {
            usuario: {
                select: {
                    nombre: true,
                    lote: {
                        select: { numero: true, manzana: { select: { numero: true } } },
                    },
                },
            },
        },
        orderBy: [{ estado: "desc" }, { createdAt: "desc" }], // abiertas primero
    });

    return NextResponse.json(mascotas);
}

// POST /api/mascotas
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { tipo, nombre, descripcion, foto, zona, contacto } = body as {
        tipo: TipoAlertaMascota;
        nombre?: string;
        descripcion: string;
        foto?: string;
        zona: string;
        contacto: string;
    };

    if (!tipo || !descripcion || !zona || !contacto) {
        return NextResponse.json(
            { error: "Tipo, descripción, zona y contacto son obligatorios." },
            { status: 400 }
        );
    }

    const tipos: TipoAlertaMascota[] = ["PERDIDA", "ENCONTRADA"];
    if (!tipos.includes(tipo)) {
        return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }

    const mascota = await prisma.mascotaPerdida.create({
        data: {
            tipo,
            nombre: nombre?.trim() || null,
            descripcion: descripcion.trim(),
            foto: foto?.trim() || null,
            zona: zona.trim(),
            contacto: contacto.trim(),
            usuarioId: parseInt(session.user.id!),
        },
    });

    return NextResponse.json(mascota, { status: 201 });
}
