import { NextRequest, NextResponse } from "next/server";
import { BARRIO_CENTER } from "@/lib/barrio/constantes";
import { climaFuerte } from "@/lib/clima";
import { prisma } from "@/lib/prisma/client";
import { enviarPushBroadcast } from "@/lib/push/enviarPush";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [lat, lng] = BARRIO_CENTER;
  const base = process.env.OPEN_METEO_URL ?? "https://api.open-meteo.com";
  const res = await fetch(
    `${base}/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,wind_gusts_10m_max,temperature_2m_max&forecast_days=2&timezone=America/Argentina/Cordoba`,
    { cache: "no-store" },
  );
  const data = await res.json();
  const aviso = climaFuerte(data.daily);
  if (!aviso) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "sin clima fuerte",
    });
  }

  const fecha = new Date().toISOString().slice(0, 10);
  try {
    await prisma.alertaClima.create({ data: { fecha } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({
        ok: true,
        enviado: false,
        motivo: "ya avisado hoy",
      });
    }
    console.error("alerta-clima: no se pudo registrar el día", err);
    return NextResponse.json(
      { error: "No se pudo registrar el día." },
      { status: 500 },
    );
  }

  await enviarPushBroadcast({
    title: aviso.titulo,
    body: aviso.consejo,
    url: "/inicio",
    tag: `alerta-clima-${fecha}`,
  });

  return NextResponse.json({
    ok: true,
    enviado: true,
    fecha,
    titulo: aviso.titulo,
  });
}
