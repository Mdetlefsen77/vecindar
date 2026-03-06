import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { auth } from "@/lib/auth";
import { type Rol } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/usuarios/[id] — solo ADMIN
export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }

    const { id } = await params;
    const usuario = await prisma.usuario.findUnique({
        where: { id: parseInt(id) },
        select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            rol: true,
            verificado: true,
            createdAt: true,
            lote: {
                select: {
                    id: true,
                    numero: true,
                    calleFrente: true,
                    area: true,
                    manzana: { select: { numero: true, zona: true } },
                },
            },
            incidentes: {
                select: { id: true, tipo: true, estado: true, fechaHora: true },
                orderBy: { fechaHora: "desc" },
                take: 5,
            },
            requerimientos: {
                select: { id: true, categoria: true, titulo: true, estado: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 5,
            },
            _count: {
                select: { incidentes: true, requerimientos: true, alertasPanico: true },
            },
        },
    });

    if (!usuario) {
        return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json(usuario);
}

// PATCH /api/usuarios/[id] — solo ADMIN
// Body: { rol?, verificado?, resetPassword? }
export async function PATCH(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { rol, verificado, nuevaPassword } = body as {
        rol?: Rol;
        verificado?: boolean;
        nuevaPassword?: string;
    };

    const rolesValidos: Rol[] = ["VECINO", "REFERENTE_MANZANA", "SEGURIDAD", "ADMIN"];
    if (rol && !rolesValidos.includes(rol)) {
        return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (rol !== undefined) updateData.rol = rol;
    if (verificado !== undefined) updateData.verificado = verificado;
    if (nuevaPassword) {
        if (nuevaPassword.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres." },
                { status: 400 }
            );
        }
        updateData.password = await hash(nuevaPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const usuario = await prisma.usuario.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: { id: true, nombre: true, email: true, rol: true, verificado: true },
    });

    return NextResponse.json(usuario);
}
