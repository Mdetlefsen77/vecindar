import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, requireRole } from "@/lib/api/guard";
import { actualizarIncidenteSchema } from "@/lib/validation/incidentes";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/incidentes/[id] ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const incidente = await prisma.incidente.findUnique({
    where: { id: parseInt(id) },
    include: {
      reportadoPor: {
        select: {
          nombre: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      lote: {
        select: { numero: true, manzana: { select: { numero: true } } },
      },
    },
  });

  if (!incidente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Vecinos no pueden ver incidentes no visibles
  if (session.user.role === "VECINO" && !incidente.visibleVecinos) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(incidente);
}

// ── PATCH /api/incidentes/[id] ───────────────────────────────────────────────
// Body: { estado?, visibleVecinos?, prioridad? }  — admin y seguridad
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const roleError = requireRole(
    session.user.role,
    ["ADMIN", "SEGURIDAD"],
    "Solo administración o seguridad pueden modificar incidentes.",
  );
  if (roleError) return roleError;

  const { id } = await params;
  const body = await req.json();
  const parsed = actualizarIncidenteSchema.safeParse(body);
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
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { estado, visibleVecinos, prioridad } = parsed.data;

  const incidente = await prisma.incidente.update({
    where: { id: parseInt(id) },
    data: {
      ...(estado !== undefined ? { estado } : {}),
      ...(visibleVecinos !== undefined ? { visibleVecinos } : {}),
      ...(prioridad !== undefined ? { prioridad } : {}),
    },
  });

  return NextResponse.json(incidente);
}
