import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/mascotas/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const mascota = await prisma.mascotaPerdida.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, usuarioId: true, estado: true },
  });

  if (!mascota) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const esAdmin = session.user.role === "ADMIN";
  const esDuenio = mascota.usuarioId === parseInt(session.user.id!);

  if (!esAdmin && !esDuenio) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = await req.json();
  const { estado } = body as { estado: boolean };

  if (typeof estado !== "boolean") {
    return NextResponse.json(
      { error: "El campo estado debe ser boolean." },
      { status: 400 },
    );
  }

  const updated = await prisma.mascotaPerdida.update({
    where: { id: parseInt(id) },
    data: {
      estado,
      resueltaAt: estado === false ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
