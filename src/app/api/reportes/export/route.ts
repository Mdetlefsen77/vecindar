import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/guard";
import { esGestor, GESTORES_REPORTES, puedeGenerarNivel } from "@/lib/permisos";
import { construirReporte } from "@/lib/reportes/modelo";
import { limitesMes, mesAnteriorCerrado } from "@/lib/reportes/periodo";
import { buscarArchivado, datosComoModelo } from "@/lib/reportes/archivo";
import type { NivelReporte } from "@/lib/reportes/tipos";

// GET /api/reportes/export?anio=&mes=&nivel= — CSV de "Requiere atención"
// (HU-08 §12.5). Única tabla de detalle de esta primera versión del reporte
// — ver el recorte del catálogo de §5 documentado en docs/tasks-reportes.md.
// Mismo patrón que /api/cobranza/export.
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { session } = guard;
  if (!esGestor(session.user.role, GESTORES_REPORTES)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const anio = searchParams.get("anio");
  const mes = searchParams.get("mes");
  const nivelParam = (searchParams.get("nivel") as NivelReporte) ?? "INTERNO";
  const nivel: NivelReporte = puedeGenerarNivel(session.user.role, nivelParam)
    ? nivelParam
    : "INTERNO";

  const periodo =
    anio && mes ? limitesMes(Number(anio), Number(mes)) : mesAnteriorCerrado();

  const archivado = await buscarArchivado(periodo, nivel);
  const modelo = archivado
    ? datosComoModelo(archivado.datos)
    : await construirReporte({ periodo, periodoTipo: "MENSUAL", nivel });

  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    ["tipo", "titulo", "dias_abierto", "responsable"].join(","),
    ...modelo.requiereAtencion.items.map((i) =>
      [i.tipo, i.titulo, i.diasAbierto, i.responsable ?? ""].map(esc).join(","),
    ),
  ].join("\n");

  const anioNum = periodo.inicio.getUTCFullYear();
  const mesNum = periodo.inicio.getUTCMonth() + 1;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-requiere-atencion-${anioNum}-${String(mesNum).padStart(2, "0")}.csv"`,
    },
  });
}
