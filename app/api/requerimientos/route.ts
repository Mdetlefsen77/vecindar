import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { CategoriaReq } from "@prisma/client";

// ── GET /api/requerimientos ──────────────────────────────────────────────────
// Query params:
//   ?mine=true         → solo los del usuario autenticado
//   ?estado=NUEVO      → filtrar por estado
//   ?categoria=CALLES  → filtrar por categoría
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "true";
    const estado = searchParams.get("estado") ?? undefined;
    const categoria = searchParams.get("categoria") ?? undefined;

    const requerimientos = await prisma.requerimiento.findMany({
        where: {
            ...(mine ? { usuarioId: parseInt(session.user.id!) } : {}),
            ...(estado ? { estado: estado as never } : {}),
            ...(categoria ? { categoria: categoria as CategoriaReq } : {}),
        },
        include: {
            usuario: {
                select: {
                    id: true,
                    nombre: true,
                    lote: { select: { numero: true, manzana: { select: { numero: true } } } },
                },
            },
            _count: { select: { comentarios: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requerimientos);
}

// ── POST /api/requerimientos ─────────────────────────────────────────────────
// Body: { categoria, titulo, descripcion, imagenes? }
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { categoria, titulo, descripcion, imagenes } = body;

    if (!categoria || !titulo?.trim() || !descripcion?.trim()) {
        return NextResponse.json(
            { error: "Categoría, título y descripción son obligatorios." },
            { status: 400 }
        );
    }

    const requerimiento = await prisma.requerimiento.create({
        data: {
            categoria,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            imagenes: imagenes ?? [],
            usuarioId: parseInt(session.user.id!),
        },
    });

    return NextResponse.json(requerimiento, { status: 201 });
}
