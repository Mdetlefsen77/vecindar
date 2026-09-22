import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUserId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { puedeGenerarNivel } from "@/lib/permisos";
import { archivarReporteSchema } from "@/lib/validation/reportes";
import { archivarReporte } from "@/lib/reportes/archivo";
import { limitesMes } from "@/lib/reportes/periodo";

// POST /api/reportes/archivar — genera (o reusa) el archivo de un período+nivel.
// HU-06/§7.2 de docs/proposal-reportes.md.
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = archivarReporteSchema.safeParse(body);
  if (!parsed.success) return respuestaValidacion(parsed.error);

  const { anio, mes, nivel, nota, forzarRecalculo } = parsed.data;

  if (!puedeGenerarNivel(session.user.role, nivel)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const periodo = limitesMes(anio, mes);
  const reporte = await archivarReporte({
    periodo,
    periodoTipo: "MENSUAL",
    nivel,
    generadoPorId: getUserId(session),
    nota,
    forzarRecalculo,
  });

  return NextResponse.json(
    { numero: reporte.numero, generadoAt: reporte.generadoAt },
    { status: 201 },
  );
}
