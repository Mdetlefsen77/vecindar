import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession } from "@/lib/api/guard";
import { enviarPushAdmins } from "@/lib/push/enviarPush";
import { crearAlertaPanicoSchema } from "@/lib/validation/panico";

// GET /api/panico
// Admin: todas las alertas (activas primero, luego cerradas recientes)
// Vecino: solo sus propias alertas activas
export async function GET(_req: NextRequest) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;
  const { session } = guard;

  const esAdmin =
    session.user.role === "ADMIN" || session.user.role === "SEGURIDAD";

  const alertas = await prisma.alertaPanico.findMany({
    where: esAdmin
      ? {} // admin ve todo
      : { usuarioId: parseInt(session.user.id!) }, // vecino solo las suyas
    include: {
      usuario: {
        select: {
          nombre: true,
          telefono: true,
          lote: {
            select: {
              numero: true,
              manzana: { select: { numero: true, zona: true } },
            },
          },
        },
      },
      atendioPor: { select: { nombre: true } },
    },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
    take: esAdmin ? 50 : 10,
  });

  return NextResponse.json(alertas);
}

// POST /api/panico — crear nueva alerta de pánico
export async function POST(req: NextRequest) {
  const guard = await requireSession("No autenticado.");
  if (guard.response) return guard.response;
  const { session } = guard;

  // Bloquear si ya tiene una alerta activa
  const activa = await prisma.alertaPanico.findFirst({
    where: {
      usuarioId: parseInt(session.user.id!),
      estado: { in: ["ENVIADO", "RECIBIDO", "EN_ATENCION"] },
    },
  });

  if (activa) {
    return NextResponse.json(
      { error: "Ya tenés una alerta activa.", alerta: activa },
      { status: 409 },
    );
  }

  const body = await req.json();
  const parsed = crearAlertaPanicoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Se requieren coordenadas de ubicación." },
      { status: 400 },
    );
  }

  const alerta = await prisma.alertaPanico.create({
    data: {
      usuarioId: parseInt(session.user.id!),
      latitud: parsed.data.latitud,
      longitud: parsed.data.longitud,
      estado: "ENVIADO",
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          lote: {
            select: {
              numero: true,
              manzana: { select: { numero: true } },
            },
          },
        },
      },
    },
  });

  // Enviar push en background — no bloquea la respuesta al vecino
  const loteInfo = alerta.usuario?.lote
    ? ` · MZ ${alerta.usuario.lote.manzana.numero} Lote ${alerta.usuario.lote.numero}`
    : "";
  void enviarPushAdmins({
    title: "🆘 Alerta SOS activada",
    body: `${alerta.usuario?.nombre ?? "Un vecino"} necesita ayuda${loteInfo}.`,
    url: "/panico",
    tag: `sos-${alerta.id}`,
    requireInteraction: true,
    tipo: "SOS",
  });

  return NextResponse.json(alerta, { status: 201 });
}

