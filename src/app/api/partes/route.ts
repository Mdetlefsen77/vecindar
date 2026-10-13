import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireRoleSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { GESTORES_PARTES } from "@/lib/permisos";
import { parteTurnoSchema } from "@/lib/validation/partes";

// POST /api/partes — cargar el parte de un turno (ADMIN/SEGURIDAD).
// Un parte por (fecha, turno): si ya existe, 409 con su id para editarlo.
export async function POST(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_PARTES);
  if (guard.response) return guard.response;
  const { session } = guard;

  const parsed = parteTurnoSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const { fecha, ...datos } = parsed.data;

  try {
    const parte = await prisma.parteTurno.create({
      data: {
        ...datos,
        fecha: new Date(`${fecha}T00:00:00Z`),
        autorId: getUserId(session),
      },
      select: { id: true },
    });
    return NextResponse.json(parte, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existente = await prisma.parteTurno.findUnique({
        where: {
          fecha_turno: {
            fecha: new Date(`${fecha}T00:00:00Z`),
            turno: datos.turno,
          },
        },
        select: { id: true },
      });
      return NextResponse.json(
        {
          error: "Ya hay un parte cargado para ese turno. Podés editarlo.",
          existenteId: existente?.id ?? null,
        },
        { status: 409 },
      );
    }
    throw err;
  }
}
