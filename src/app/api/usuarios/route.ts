import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession } from "@/lib/api/guard";
import { type Rol } from "@/generated/enums";

// Máximo de cuentas de usuario por lote (ej: madre y padre en la misma casa)
const MAX_USUARIOS_POR_LOTE = 2;

// GET /api/usuarios — solo ADMIN
export async function GET(req: NextRequest) {
  const guard = await requireRoleSession(["ADMIN"]);
  if (guard.response) return guard.response;

  const { searchParams } = new URL(req.url);
  const rol = searchParams.get("rol") as Rol | null;
  const verificado = searchParams.get("verificado"); // "true" | "false" | null
  const q = searchParams.get("q"); // búsqueda por nombre o email

  const usuarios = await prisma.usuario.findMany({
    where: {
      ...(rol ? { rol } : {}),
      ...(verificado !== null ? { verificado: verificado === "true" } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      rol: true,
      verificado: true,
      createdAt: true,
      lote: {
        select: {
          numero: true,
          manzana: { select: { numero: true, zona: true } },
        },
      },
      _count: {
        select: {
          incidentes: true,
          requerimientos: true,
        },
      },
    },
    orderBy: [{ verificado: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, email, password, telefono, loteId } = body;

    // Validaciones básicas
    if (!nombre || !email || !password || !loteId) {
      return NextResponse.json(
        { error: "Nombre, email, contraseña y lote son obligatorios." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }

    // Verificar que el email no esté registrado
    const emailExistente = await prisma.usuario.findUnique({
      where: { email },
    });
    if (emailExistente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 },
      );
    }

    // Verificar que el lote exista y todavía tenga lugar disponible
    const lote = await prisma.lote.findUnique({
      where: { id: parseInt(loteId) },
      include: { usuarios: { select: { id: true } } },
    });

    if (!lote) {
      return NextResponse.json(
        { error: "El lote seleccionado no existe." },
        { status: 404 },
      );
    }

    if (lote.usuarios.length >= MAX_USUARIOS_POR_LOTE) {
      return NextResponse.json(
        {
          error: `Ese lote ya alcanzó el máximo de ${MAX_USUARIOS_POR_LOTE} cuentas registradas.`,
        },
        { status: 409 },
      );
    }

    // Hashear contraseña
    const hashedPassword = await hash(password, 12);

    // Crear usuario (pendiente de verificación por admin)
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        telefono: telefono || null,
        loteId: parseInt(loteId),
        verificado: false,
        rol: "VECINO",
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        verificado: true,
        rol: true,
        lote: {
          select: {
            numero: true,
            manzana: { select: { numero: true, zona: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        message:
          "Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.",
        usuario: nuevoUsuario,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
