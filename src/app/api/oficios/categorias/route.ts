import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireRoleSession } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { GESTORES_OFICIOS } from "@/lib/permisos";
import { categoriaSchema } from "@/lib/validation/oficios";

// POST /api/oficios/categorias — el admin suma un rubro (ADMIN).
export async function POST(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_OFICIOS);
  if (guard.response) return guard.response;

  const parsed = categoriaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return respuestaValidacion(parsed.error);

  try {
    const categoria = await prisma.categoriaOficio.create({
      data: parsed.data,
      select: { id: true, nombre: true, grupo: true },
    });
    return NextResponse.json(categoria, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un rubro con ese nombre." },
        { status: 409 },
      );
    }
    throw err;
  }
}
