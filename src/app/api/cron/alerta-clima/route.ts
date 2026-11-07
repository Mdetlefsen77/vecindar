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
  let res: Response;
  const control = new AbortController();
  const plazo = setTimeout(() => control.abort(), 5000);
  try {
    res = await fetch(
      `${base}/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,wind_gusts_10m_max,temperature_2m_max&forecast_days=2&timezone=America/Argentina/Cordoba`,
      { cache: "no-store", signal: control.signal },
    );
  } catch {
    clearTimeout(plazo);
    console.error("alerta-clima: no se pudo consultar Open-Meteo");
    return NextResponse.json(
      { error: "No se pudo consultar el clima." },
      { status: 502 },
    );
  }
  clearTimeout(plazo);
  if (!res.ok) {
    console.error("alerta-clima: Open-Meteo respondió", res.status);
    return NextResponse.json(
      { error: "No se pudo consultar el clima." },
      { status: 502 },
    );
  }
  const data = await res.json();
  const aviso = climaFuerte(data.daily);
  if (!aviso) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "sin clima fuerte",
    });
  }

  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date());
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

  try {
    await enviarPushBroadcast({
      title: aviso.titulo,
      body: aviso.consejo,
      url: "/inicio",
      tag: `alerta-clima-${fecha}`,
    });
  } catch (err) {
    console.error("alerta-clima: falló el envío de la push", err);
    return NextResponse.json(
      { error: "No se pudo enviar la push." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    enviado: true,
    fecha,
    titulo: aviso.titulo,
  });
}
