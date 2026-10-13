import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireRoleSession, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { GESTORES_PARTES } from "@/lib/permisos";
import { parteTurnoSchema } from "@/lib/validation/partes";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/partes/[id] — corregir un parte ya cargado (ADMIN/SEGURIDAD).
// Mismo body completo que el POST: el formulario siempre manda todo.
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_PARTES);
  if (guard.response) return guard.response;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const parsed = parteTurnoSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const { fecha, ...datos } = parsed.data;

  try {
    const parte = await prisma.parteTurno.update({
      where: { id },
      data: { ...datos, fecha: new Date(`${fecha}T00:00:00Z`) },
      select: { id: true },
    });
    return NextResponse.json(parte);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "No encontrado." }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "Ya hay otro parte cargado para ese turno." },
          { status: 409 },
        );
      }
    }
    throw err;
  }
}
