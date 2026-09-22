import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarPushAdmins } from "@/lib/push/enviarPush";
import { archivarReporte } from "@/lib/reportes/archivo";
import { mesAnteriorCerrado } from "@/lib/reportes/periodo";

/**
 * GET /api/cron/reporte-mensual
 *
 * Disparado por Vercel Cron (ver vercel.json) una vez por día — igual patrón
 * que recordatorios-cobranza — pero solo actúa el primer día hábil del mes
 * (§12.6 de la spec). Archiva el reporte INTERNO del mes recién cerrado y
 * avisa por push a ADMIN/SEGURIDAD (mismo conjunto que GESTORES_PANICO,
 * reutiliza enviarPushAdmins). Empieza por push — no hay proveedor de email
 * en el proyecto (R6/D5).
 */

const RE_BEARER = (secret: string) => `Bearer ${secret}`;

/** `true` si `fecha` es el primer día hábil del mes (el 1° si cae lunes-viernes, si no el lunes siguiente). */
function esPrimerDiaHabilDelMes(fecha: Date): boolean {
  const dia = fecha.getDate();
  const diaSemana = fecha.getDay(); // 0=domingo … 6=sábado
  if (dia === 1 && diaSemana >= 1 && diaSemana <= 5) return true;
  if (dia === 2 && diaSemana === 1) return true; // 1° cayó domingo
  if (dia === 3 && diaSemana === 1) return true; // 1° cayó sábado
  return false;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== RE_BEARER(secret)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const ahora = new Date();
  if (!esPrimerDiaHabilDelMes(ahora)) {
    return NextResponse.json({
      ok: true,
      generado: false,
      motivo: "no es el día",
    });
  }

  // El reporte automático necesita un `generadoPorId` — se atribuye al
  // ADMIN más antiguo de la base. Con un solo ADMIN real (caso típico de
  // este proyecto) es exacto; documentado como simplificación si más
  // adelante hay varios.
  const admin = await prisma.usuario.findFirst({
    where: { rol: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "No hay ningún ADMIN en la base." },
      { status: 500 },
    );
  }

  const periodo = mesAnteriorCerrado(ahora);
  const reporte = await archivarReporte({
    periodo,
    periodoTipo: "MENSUAL",
    nivel: "INTERNO",
    generadoPorId: admin.id,
  });

  const anio = periodo.inicio.getUTCFullYear();
  const mes = periodo.inicio.getUTCMonth() + 1;

  await enviarPushAdmins({
    title: "📊 Reporte mensual listo",
    body: `El reporte de ${mes}/${anio} ya está disponible — N° ${String(reporte.numero).padStart(4, "0")}.`,
    url: `/reportes?anio=${anio}&mes=${mes}&nivel=INTERNO`,
    tag: `reporte-mensual-${anio}-${mes}`,
  });

  return NextResponse.json({
    ok: true,
    generado: true,
    numero: reporte.numero,
  });
}
