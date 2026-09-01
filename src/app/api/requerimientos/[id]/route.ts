import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, requireRole } from "@/lib/api/guard";
import { GESTORES_REQUERIMIENTOS } from "@/lib/permisos";
import { actualizarRequerimientoSchema } from "@/lib/validation/requerimientos";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/requerimientos/[id] ─────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;

  const { id } = await params;

  const requerimiento = await prisma.requerimiento.findUnique({
    where: { id: parseInt(id) },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
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

  if (!requerimiento) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(requerimiento);
}

// ── PATCH /api/requerimientos/[id] ───────────────────────────────────────────
// Body: { estado?, prioridad? }  — admin, seguridad y referente de manzana
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const roleError = requireRole(
    session.user.role,
    GESTORES_REQUERIMIENTOS,
    "No tenés permisos para cambiar el estado de este requerimiento.",
  );
  if (roleError) return roleError;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = actualizarRequerimientoSchema.safeParse(body);

  if (!parsed.success) {
    const badField = parsed.error.issues[0]?.path[0];
    if (badField === "estado") {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    if (badField === "prioridad") {
      return NextResponse.json(
        { error: "Prioridad inválida." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Nada que actualizar." },
      { status: 400 },
    );
  }

  const { estado, prioridad } = parsed.data;

  const existe = await prisma.requerimiento.findUnique({
    where: { id: parseInt(id) },
    select: { id: true },
  });
  if (!existe) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const requerimiento = await prisma.requerimiento.update({
    where: { id: parseInt(id) },
    data: {
      ...(estado !== undefined ? { estado } : {}),
      ...(prioridad !== undefined ? { prioridad } : {}),
    },
  });

  return NextResponse.json(requerimiento);
}
