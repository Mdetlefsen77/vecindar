import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, parseId } from "@/lib/api/guard";
import { GESTORES_OFICIOS } from "@/lib/permisos";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/oficios/reportes/[id] — marcar un reporte como resuelto (ADMIN).
export async function PATCH(_req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_OFICIOS);
  if (guard.response) return guard.response;

  const id = parseId((await params).id);
  const r = id
    ? await prisma.reporteOficio.updateMany({
        where: { id },
        data: { resuelto: true },
      })
    : { count: 0 };
  if (r.count === 0) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
