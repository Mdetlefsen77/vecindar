import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, parseId } from "@/lib/api/guard";
import { GESTORES_OFICIOS } from "@/lib/permisos";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/oficios/categorias/[id] — activar / desactivar un rubro (ADMIN).
// Desactivado no se ofrece al publicar; los oficios que ya lo usan siguen.
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_OFICIOS);
  if (guard.response) return guard.response;

  const id = parseId((await params).id);
  const body = await req.json().catch(() => null);
  if (!id || typeof body?.activa !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const r = await prisma.categoriaOficio.updateMany({
    where: { id },
    data: { activa: body.activa },
  });
  if (r.count === 0) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
