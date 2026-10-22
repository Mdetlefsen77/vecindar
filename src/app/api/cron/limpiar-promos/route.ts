import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

/**
 * GET /api/cron/limpiar-promos
 *
 * Disparado por Vercel Cron (ver vercel.json) una vez por día. Borra las
 * promos de oficios vencidas. No define cuándo deja de verse una promo: eso
 * lo hace el filtro por `venceAt` en cada consulta, a la hora exacta.
 */

const RE_BEARER = (secret: string) => `Bearer ${secret}`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== RE_BEARER(secret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { count } = await prisma.promoOficio.deleteMany({
    where: { venceAt: { lte: new Date() } },
  });
  return NextResponse.json({ ok: true, borradas: count });
}
