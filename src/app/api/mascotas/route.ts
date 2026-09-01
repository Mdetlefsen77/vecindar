import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { crearMascotaSchema } from "@/lib/validation/mascotas";
import { type TipoAlertaMascota } from "@/generated/enums";
import { enviarPushBroadcast } from "@/lib/push/enviarPush";

// GET /api/mascotas?tipo=PERDIDA|ENCONTRADA&estado=abierta|resuelta
export async function GET(req: NextRequest) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;

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
          apellido: true,
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
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = crearMascotaSchema.safeParse(body);
  if (!parsed.success) {
    const badField = parsed.error.issues[0]?.path[0];
    return NextResponse.json(
      {
        error:
          badField === "tipo"
            ? "Tipo inválido."
            : "Tipo, descripción, zona y contacto son obligatorios.",
      },
      { status: 400 },
    );
  }

  const mascota = await prisma.mascotaPerdida.create({
    data: {
      tipo: parsed.data.tipo,
      nombre: parsed.data.nombre?.trim() || null,
      descripcion: parsed.data.descripcion,
      foto: parsed.data.foto?.trim() || null,
      zona: parsed.data.zona,
      contacto: parsed.data.contacto,
      usuarioId: getUserId(session),
    },
  });

  void enviarPushBroadcast(
    {
      title:
        mascota.tipo === "PERDIDA"
          ? "🐾 Mascota perdida"
          : "🐾 Mascota encontrada",
      body: `${mascota.nombre ?? "Sin nombre"} — ${mascota.descripcion.slice(0, 100)}`,
      url: `/mascotas/${mascota.id}`,
      tag: `mascota-${mascota.id}`,
    },
    getUserId(session),
  );

  return NextResponse.json(mascota, { status: 201 });
}
