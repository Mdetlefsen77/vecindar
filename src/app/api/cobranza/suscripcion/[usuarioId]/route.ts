import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession } from "@/lib/api/guard";
import { GESTORES_USUARIOS } from "@/lib/permisos";
import { actualizarSuscripcionSchema } from "@/lib/validation/cobranza";

type Params = { params: Promise<{ usuarioId: string }> };

// PATCH /api/cobranza/suscripcion/[usuarioId] — exento / monto / nota (solo ADMIN)
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_USUARIOS);
  if (guard.response) return guard.response;

  const { usuarioId: raw } = await params;
  const usuarioId = parseInt(raw, 10);
  if (Number.isNaN(usuarioId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actualizarSuscripcionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    return NextResponse.json(
      { error: "El usuario no existe." },
      { status: 404 },
    );
  }

  const data = parsed.data;
  const suscripcion = await prisma.suscripcion.upsert({
    where: { usuarioId },
    update: data,
    create: { usuarioId, ...data },
  });

  return NextResponse.json(suscripcion);
}
