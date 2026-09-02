import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { crearRequerimientoSchema } from "@/lib/validation/requerimientos";
import { enviarPushBroadcast } from "@/lib/push/enviarPush";
import type { CategoriaReq } from "@/generated/enums";

const CATEGORIA_REQ_LABEL: Record<CategoriaReq, string> = {
  ILUMINACION: "Iluminación",
  PODA: "Poda",
  CALLES: "Calles",
  LIMPIEZA: "Limpieza",
  SEGURIDAD: "Seguridad",
  INFRAESTRUCTURA: "Infraestructura",
  OTRO: "Requerimiento",
};

// ── GET /api/requerimientos ──────────────────────────────────────────────────
// Query params:
//   ?mine=true         → solo los del usuario autenticado
//   ?estado=NUEVO      → filtrar por estado
//   ?categoria=CALLES  → filtrar por categoría
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";
  const estado = searchParams.get("estado") ?? undefined;
  const categoria = searchParams.get("categoria") ?? undefined;

  const requerimientos = await prisma.requerimiento.findMany({
    where: {
      ...(mine ? { usuarioId: getUserId(session) } : {}),
      ...(estado ? { estado: estado as never } : {}),
      ...(categoria ? { categoria: categoria as CategoriaReq } : {}),
    },
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
      _count: { select: { comentarios: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requerimientos);
}

// ── POST /api/requerimientos ─────────────────────────────────────────────────
// Body: { categoria, titulo, descripcion, imagenes? }
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const body = await req.json();
  const parsed = crearRequerimientoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Categoría, título y descripción son obligatorios." },
      { status: 400 },
    );
  }

  const { categoria, titulo, descripcion, imagenes, prioridad } = parsed.data;

  const requerimiento = await prisma.requerimiento.create({
    data: {
      categoria,
      titulo,
      descripcion,
      imagenes: imagenes ?? [],
      prioridad: prioridad ?? "MEDIO",
      usuarioId: getUserId(session),
    },
  });

  // Aviso a todo el barrio (menos el autor) — mismo patrón que incidentes/mascotas.
  void enviarPushBroadcast(
    {
      title: `🛠️ Nuevo requerimiento: ${CATEGORIA_REQ_LABEL[categoria]}`,
      body: titulo.slice(0, 120),
      url: `/requerimientos/${requerimiento.id}`,
      tag: `requerimiento-${requerimiento.id}`,
    },
    getUserId(session),
  );

  return NextResponse.json(requerimiento, { status: 201 });
}
