import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { type EstadoAlerta } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const ESTADOS_VALIDOS: EstadoAlerta[] = ["ENVIADO", "RECIBIDO", "EN_ATENCION", "CERRADO"];

// PATCH /api/panico/[id]
// Admin/Seguridad: avanzar estado + notas
// Vecino: solo puede cancelar (→ CERRADO) su propia alerta si está en ENVIADO
export async function PATCH(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { estado, notas } = body as { estado?: EstadoAlerta; notas?: string };

    const alerta = await prisma.alertaPanico.findUnique({
        where: { id: parseInt(id) },
    });

    if (!alerta) {
        return NextResponse.json({ error: "Alerta no encontrada." }, { status: 404 });
    }

    const esAdmin =
        session.user.role === "ADMIN" || session.user.role === "SEGURIDAD";
    const esDuenio = parseInt(session.user.id!) === alerta.usuarioId;

    // Vecino solo puede cancelar su propia alerta en estado ENVIADO
    if (!esAdmin) {
        if (!esDuenio) {
            return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
        }
        if (estado !== "CERRADO" || alerta.estado !== "ENVIADO") {
            return NextResponse.json(
                { error: "Solo podés cancelar alertas en estado ENVIADO." },
                { status: 403 }
            );
        }
    }

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
        return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    // Timestamps automáticos según estado
    const timestamps: Record<string, Date | null> = {};
    if (estado === "RECIBIDO" && !alerta.recibidoAt) {
        timestamps.recibidoAt = new Date();
    }
    if (estado === "EN_ATENCION" && !alerta.atendidoAt) {
        timestamps.atendidoAt = new Date();
    }
    if (estado === "CERRADO" && !alerta.cerradoAt) {
        timestamps.cerradoAt = new Date();
    }

    const updated = await prisma.alertaPanico.update({
        where: { id: parseInt(id) },
        data: {
            ...(estado ? { estado } : {}),
            ...(notas !== undefined ? { notas } : {}),
            ...(esAdmin && estado && estado !== "ENVIADO"
                ? { atendioPorId: parseInt(session.user.id!) }
                : {}),
            ...timestamps,
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
            atendioPor: { select: { nombre: true } },
        },
    });

    return NextResponse.json(updated);
}
