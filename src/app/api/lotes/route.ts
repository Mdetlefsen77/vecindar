import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/lotes?manzanaId=3
// GET /api/lotes?disponibles=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soloDisponibles = searchParams.get("disponibles") === "true";
    const manzanaId = searchParams.get("manzanaId");

    const lotes = await prisma.lote.findMany({
      where: {
        ...(soloDisponibles ? { usuario: null } : {}),
        ...(manzanaId ? { manzanaId: parseInt(manzanaId) } : {}),
      },
      include: {
        manzana: { select: { numero: true, zona: true } },
        usuario: { select: { id: true } },
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

    return NextResponse.json({ lotes });
  } catch (error) {
    console.error("Error al obtener lotes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
