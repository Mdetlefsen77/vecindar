import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { avisoSchema } from "@/lib/validation/avisos";
import { enviarPushBroadcast } from "@/lib/push/enviarPush";
import { DURACION_AVISO, MAX_AVISOS_POR_DIA, TIPO_AVISO } from "@/lib/avisos";

// POST /api/avisos — un vecino avisa algo al barrio. Vence solo según la
// duración elegida. Push a todos solo si el tipo es de riesgo.
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const autorId = getUserId(guard.session);

  const parsed = avisoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const { duracion, ...datos } = parsed.data;

  const ahora = new Date();
  const recientes = await prisma.aviso.count({
    where: { autorId, createdAt: { gt: new Date(ahora.getTime() - 86_400_000) } },
  });
  if (recientes >= MAX_AVISOS_POR_DIA) {
    return NextResponse.json(
      { error: `Podés dar hasta ${MAX_AVISOS_POR_DIA} avisos por día.` },
      { status: 429 },
    );
  }

  const aviso = await prisma.aviso.create({
    data: {
      ...datos,
      autorId,
      venceAt: new Date(ahora.getTime() + DURACION_AVISO[duracion].ms),
    },
  });

  const tipo = TIPO_AVISO[datos.tipo];
  if (tipo.riesgo) {
    void enviarPushBroadcast(
      {
        title: `${tipo.emoji} Aviso: ${tipo.label}`,
        body: `${datos.ubicacion}${datos.detalle ? ` — ${datos.detalle}` : ""}`.slice(0, 140),
        url: `/avisos#aviso-${aviso.id}`,
        tag: `aviso-${aviso.id}`,
      },
      autorId,
    );
  }

  return NextResponse.json({ id: aviso.id }, { status: 201 });
}
