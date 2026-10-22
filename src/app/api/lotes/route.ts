import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { auth } from "@/lib/auth";
import { parseId } from "@/lib/api/guard";
import { esGestor, VEN_DETALLE_LOTES } from "@/lib/permisos";

// Debe coincidir con el límite usado en /api/usuarios al registrar
const MAX_USUARIOS_POR_LOTE = 2;

// GET /api/lotes?manzanaId=3
// GET /api/lotes?disponibles=true  → lotes con lugar para al menos 1 cuenta más
//
// Sin sesión (formulario de registro) solo se permite `?disponibles=true` y se
// devuelve un payload mínimo: nada de ids de usuarios ni incidentes del lote.
// Con sesión, quién vive en cada lote y sus incidentes quedan solo para
// VEN_DETALLE_LOTES (guardia y admin); un vecino recibe el mismo payload mínimo.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soloDisponibles = searchParams.get("disponibles") === "true";
    const manzanaId = parseId(searchParams.get("manzanaId"));

    const session = await auth();
    const publico = !session?.user;
    const detalle = !publico && esGestor(session.user.role, VEN_DETALLE_LOTES);

    if (publico && !soloDisponibles) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const lotes = await prisma.lote.findMany({
      where: {
        ...(manzanaId ? { manzanaId } : {}),
      },
      include: {
        manzana: { select: { numero: true, zona: true } },
        _count: { select: { usuarios: true } },
        // Detalle interno solo para la guardia y el admin (lo consume el mapa).
        ...(!detalle
          ? {}
          : {
              usuarios: { select: { id: true, nombre: true, apellido: true } },
              incidentes: {
                where: { estado: { not: "RESUELTO" } },
                select: { id: true, tipo: true, estado: true },
              },
            }),
      },
      orderBy: [
        { manzana: { zona: "asc" } },
        { manzana: { numero: "asc" } },
        { numero: "asc" },
      ],
    });

    // "Disponible" = todavía queda lugar para otra cuenta en ese lote.
    const filtrados = soloDisponibles
      ? lotes.filter((l) => l._count.usuarios < MAX_USUARIOS_POR_LOTE)
      : lotes;

    if (!detalle) {
      const resultado = filtrados.map((l) => ({
        id: l.id,
        numero: l.numero,
        calleFrente: l.calleFrente,
        manzana: l.manzana,
      }));
      return NextResponse.json({ lotes: resultado });
    }

    return NextResponse.json({ lotes: filtrados });
  } catch (error) {
    console.error("Error al obtener lotes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
