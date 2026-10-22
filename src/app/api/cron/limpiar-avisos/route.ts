import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

/**
 * GET /api/cron/limpiar-avisos
 *
 * Disparado por Vercel Cron (ver vercel.json) una vez por día. Borra los
 * avisos vencidos o resueltos. No define cuándo deja de verse un aviso: eso
 * lo hace `avisoVigente` en cada consulta.
 */

const RE_BEARER = (secret: string) => `Bearer ${secret}`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== RE_BEARER(secret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { count } = await prisma.aviso.deleteMany({
    where: { OR: [{ venceAt: { lte: new Date() } }, { resueltoAt: { not: null } }] },
  });
  return NextResponse.json({ ok: true, borrados: count });
}
