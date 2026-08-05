import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession } from "@/lib/api/guard";
import { actualizarMascotaSchema } from "@/lib/validation/mascotas";

type Params = { params: Promise<{ id: string }> };

// GET /api/mascotas/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;

  const { id } = await params;
  const mascota = await prisma.mascotaPerdida.findUnique({
    where: { id: parseInt(id) },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          telefono: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
    },
  });

  if (!mascota) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  return NextResponse.json(mascota);
}

// PATCH /api/mascotas/[id]
// Body: { estado: boolean }  — true = abierta, false = resuelta
// Solo el dueño o un ADMIN pueden cerrarla
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const mascota = await prisma.mascotaPerdida.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, usuarioId: true, estado: true },
  });

  if (!mascota) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const puedeGestionar =
    session.user.role === "ADMIN" || session.user.role === "REFERENTE_MANZANA";
  const esDuenio = mascota.usuarioId === parseInt(session.user.id!);

  if (!puedeGestionar && !esDuenio) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = actualizarMascotaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "El campo estado debe ser boolean." },
      { status: 400 },
    );
  }

  const { estado } = parsed.data;

  const updated = await prisma.mascotaPerdida.update({
    where: { id: parseInt(id) },
    data: {
      estado,
      resueltaAt: estado === false ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
