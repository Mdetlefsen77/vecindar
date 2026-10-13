import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarPushUsuario } from "@/lib/push/enviarPush";
import { TURNOS, turnoRecienTerminado } from "@/lib/partes";

/**
 * GET /api/cron/recordatorio-parte
 *
 * Lo dispara GitHub Actions (.github/workflows/recordatorio-parte.yml) media
 * hora después de cada turno de la guardia — no Vercel Cron, porque el plan
 * Hobby solo admite crons diarios. Si el turno que acaba de terminar no tiene
 * parte cargado, manda un push a los usuarios con rol SEGURIDAD.
 * Mismo esquema de auth que los otros crons (Bearer CRON_SECRET).
 */

const RE_BEARER = (secret: string) => `Bearer ${secret}`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== RE_BEARER(secret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const reciente = turnoRecienTerminado();
  if (!reciente) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "ningún turno terminó recién",
    });
  }

  const { fecha, turno } = reciente;
  const parte = await prisma.parteTurno.findUnique({
    where: {
      fecha_turno: { fecha: new Date(`${fecha}T00:00:00Z`), turno },
    },
    select: { id: true },
  });
  if (parte) {
    return NextResponse.json({ ok: true, enviado: false, motivo: "ya cargado", fecha, turno });
  }

  const guardias = await prisma.usuario.findMany({
    where: { rol: "SEGURIDAD", verificado: true },
    select: { id: true },
  });

  const label = TURNOS[turno].label.toLowerCase();
  await Promise.all(
    guardias.map((g) =>
      enviarPushUsuario(g.id, {
        title: `Falta el parte del turno ${label}`,
        body: "Cargalo en Vecindar y compartilo en el grupo de seguridad.",
        url: "/partes/nuevo",
        // Mismo tag por turno: si el cron corre dos veces, el aviso se
        // reemplaza en el celular en lugar de duplicarse.
        tag: `parte-pendiente-${fecha}-${turno}`,
      }),
    ),
  );

  return NextResponse.json({
    ok: true,
    enviado: true,
    destinatarios: guardias.length,
    fecha,
    turno,
  });
}
