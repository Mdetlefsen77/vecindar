import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// Debe coincidir con el límite usado en /api/usuarios al registrar
const MAX_USUARIOS_POR_LOTE = 2;

// GET /api/lotes?manzanaId=3
// GET /api/lotes?disponibles=true  → lotes con lugar para al menos 1 cuenta más
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soloDisponibles = searchParams.get("disponibles") === "true";
    const manzanaId = searchParams.get("manzanaId");

    const lotes = await prisma.lote.findMany({
      where: {
        ...(manzanaId ? { manzanaId: parseInt(manzanaId) } : {}),
      },
      include: {
        manzana: { select: { numero: true, zona: true } },
        usuarios: { select: { id: true } },
        incidentes: {
          where: { estado: { not: "RESUELTO" } },
          select: { id: true, tipo: true, estado: true },
        },
      },
      orderBy: [
        { manzana: { zona: "asc" } },
        { manzana: { numero: "asc" } },
        { numero: "asc" },
      ],
    });

    // "Disponible" = todavía queda lugar para otra cuenta en ese lote.
    // No se puede filtrar por cantidad de relaciones directo en `where`,
    // así que se filtra acá con el conteo ya traído.
    const resultado = soloDisponibles
      ? lotes.filter((l) => l.usuarios.length < MAX_USUARIOS_POR_LOTE)
      : lotes;

    return NextResponse.json({ lotes: resultado });
  } catch (error) {
    console.error("Error al obtener lotes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
