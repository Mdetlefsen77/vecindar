import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { requireRoleSession } from "@/lib/api/guard";
import { GESTORES_USUARIOS } from "@/lib/permisos";
import { rateLimit, clientIp } from "@/lib/api/rateLimit";
import { registroUsuarioSchema } from "@/lib/validation/usuarios";
import { nombreCompleto } from "@/lib/usuarios";
import { Rol } from "@/generated/enums";
import { enumParam } from "@/lib/api/query";
import { enviarPushSoloAdmin } from "@/lib/push/enviarPush";

// Máximo de cuentas de usuario por lote (ej: madre y padre en la misma casa)
const MAX_USUARIOS_POR_LOTE = 2;

/** Error con status HTTP para cortar desde dentro de una transacción. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// GET /api/usuarios — solo ADMIN
export async function GET(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_USUARIOS);
  if (guard.response) return guard.response;

  const { searchParams } = new URL(req.url);
  const rol = enumParam(Rol, searchParams.get("rol"));
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
              { apellido: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
      rol: true,
      verificado: true,
      createdAt: true,
      ultimoLoginAt: true,
      ultimaActividadAt: true,
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
    // Registro público: limitar intentos por IP para frenar altas masivas.
    if (!rateLimit(`registro:${clientIp(req)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá un minuto y volvé a probar." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = registroUsuarioSchema.safeParse(body);

    if (!parsed.success) {
      const badField = parsed.error.issues[0]?.path[0];
      const mensajes: Record<string, string> = {
        email: "Ingresá un email válido.",
        password: "La contraseña debe tener entre 6 y 100 caracteres.",
        nombre: "El nombre debe tener al menos 2 caracteres.",
        apellido: "El apellido debe tener al menos 2 caracteres.",
        loteId: "Seleccioná un lote válido.",
      };
      return NextResponse.json(
        {
          error:
            mensajes[String(badField)] ??
            "Nombre, apellido, email, contraseña y lote son obligatorios.",
        },
        { status: 400 },
      );
    }

    const { nombre, apellido, email, password, telefono, loteId } = parsed.data;

    // Hashear la contraseña ANTES de abrir la transacción — es ~100 ms de CPU
    // y no debe mantener la transacción (ni el lock del lote) abierta.
    const hashedPassword = await hash(password, 12);

    // El límite de cuentas por lote ("madre y padre") no es un constraint de
    // la base, así que dos registros simultáneos para el último lugar podrían
    // pasar los dos el chequeo. Un advisory lock por `loteId` serializa el
    // check + create; se libera solo al terminar la transacción.
    try {
      const nuevoUsuario = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${loteId})`;

        const lote = await tx.lote.findUnique({
          where: { id: loteId },
          select: { _count: { select: { usuarios: true } } },
        });
        if (!lote) {
          throw new HttpError(404, "El lote seleccionado no existe.");
        }
        if (lote._count.usuarios >= MAX_USUARIOS_POR_LOTE) {
          throw new HttpError(
            409,
            `Ese lote ya alcanzó el máximo de ${MAX_USUARIOS_POR_LOTE} cuentas registradas.`,
          );
        }

        return tx.usuario.create({
          data: {
            nombre,
            apellido,
            email,
            password: hashedPassword,
            telefono: telefono,
            loteId: loteId,
            verificado: false,
            rol: "VECINO",
          },
          select: {
            id: true,
            nombre: true,
            apellido: true,
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
      });

      void enviarPushSoloAdmin({
        title: "👤 Nuevo registro pendiente",
        body: `${nombreCompleto(nuevoUsuario)} solicitó una cuenta — MZ ${nuevoUsuario.lote.manzana.numero} Lote ${nuevoUsuario.lote.numero}`,
        url: "/admin/usuarios?verificado=false",
        tag: `nuevo-usuario-${nuevoUsuario.id}`,
      });

      return NextResponse.json(
        {
          message:
            "Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.",
          usuario: nuevoUsuario,
        },
        { status: 201 },
      );
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con ese email." },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
