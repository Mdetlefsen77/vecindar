import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, parseId } from "@/lib/api/guard";
import { GESTORES_USUARIOS } from "@/lib/permisos";
import { actualizarUsuarioSchema } from "@/lib/validation/usuarios";

type Params = { params: Promise<{ id: string }> };

// GET /api/usuarios/[id] — solo ADMIN
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_USUARIOS);
  if (guard.response) return guard.response;

  const { id } = await params;
  const numId = parseId(id);
  if (numId === null) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: numId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
      rol: true,
      verificado: true,
      createdAt: true,
      lote: {
        select: {
          id: true,
          numero: true,
          calleFrente: true,
          area: true,
          manzana: { select: { numero: true, zona: true } },
        },
      },
      incidentes: {
        select: { id: true, tipo: true, estado: true, fechaHora: true },
        orderBy: { fechaHora: "desc" },
        take: 5,
      },
      requerimientos: {
        select: {
          id: true,
          categoria: true,
          titulo: true,
          estado: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: { incidentes: true, requerimientos: true, alertasPanico: true },
      },
    },
  });

  if (!usuario) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(usuario);
}

// PATCH /api/usuarios/[id] — solo ADMIN
// Body: { rol?, verificado?, resetPassword? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_USUARIOS);
  if (guard.response) return guard.response;

  const { id } = await params;
  const numId = parseId(id);
  if (numId === null) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const body = await req.json();
  // Una nuevaPassword vacía se trata como "no enviada", igual que el chequeo
  // truthy original (`if (nuevaPassword) {...}`).
  const parsed = actualizarUsuarioSchema.safeParse({
    ...body,
    nuevaPassword: body?.nuevaPassword || undefined,
  });

  if (!parsed.success) {
    const badField = parsed.error.issues[0]?.path[0];
    if (badField === "rol") {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }
    if (badField === "nuevaPassword") {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Nada que actualizar." },
      { status: 400 },
    );
  }

  const { rol, verificado, nuevaPassword } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (rol !== undefined) updateData.rol = rol;
  if (verificado !== undefined) updateData.verificado = verificado;
  if (nuevaPassword) {
    updateData.password = await hash(nuevaPassword, 12);
  }

  const usuario = await prisma.usuario.update({
    where: { id: numId },
    data: updateData,
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      rol: true,
      verificado: true,
    },
  });

  return NextResponse.json(usuario);
}
