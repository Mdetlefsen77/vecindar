import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { esGestor, GESTORES_PANICO } from "@/lib/permisos";
import { actualizarAlertaPanicoSchema } from "@/lib/validation/panico";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/panico/[id]
// Admin/Seguridad: avanzar estado + notas
// Vecino: solo puede cancelar (→ CERRADO) su propia alerta si está en ENVIADO
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const numId = parseId(id);
  if (numId === null) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = actualizarAlertaPanicoSchema.safeParse(body);
  if (!parsed.success) {
    const badField = parsed.error.issues[0]?.path[0];
    if (badField === "estado") {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    return respuestaValidacion(parsed.error);
  }
  const { estado, notas } = parsed.data;

  const alerta = await prisma.alertaPanico.findUnique({
    where: { id: numId },
  });

  if (!alerta) {
    return NextResponse.json(
      { error: "Alerta no encontrada." },
      { status: 404 },
    );
  }

  const esAdmin = esGestor(session.user.role, GESTORES_PANICO);
  const esDuenio = getUserId(session) === alerta.usuarioId;

  // Vecino solo puede cancelar su propia alerta en estado ENVIADO
  if (!esAdmin) {
    if (!esDuenio) {
      return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }
    if (estado !== "CERRADO" || alerta.estado !== "ENVIADO") {
      return NextResponse.json(
        { error: "Solo podés cancelar alertas en estado ENVIADO." },
        { status: 403 },
      );
    }
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
    where: { id: numId },
    data: {
      ...(estado ? { estado } : {}),
      ...(notas !== undefined ? { notas } : {}),
      ...(esAdmin && estado && estado !== "ENVIADO"
        ? { atendioPorId: getUserId(session) }
        : {}),
      ...timestamps,
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      atendioPor: { select: { nombre: true, apellido: true } },
      comentarios: {
        include: {
          usuario: {
            select: { id: true, nombre: true, apellido: true, rol: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(updated);
}
