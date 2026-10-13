import { NextRequest, NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/api/guard";
import { GESTORES_COBRANZA } from "@/lib/permisos";
import {
  deudoresParaRecordar,
  enviarPushRecordatorio,
} from "@/lib/cobranzaServer";

// POST /api/cobranza/recordatorios — push de recordatorio a todos los
// deudores ya mismo, sin esperar al cron (ADMIN/TESORERO).
// Body opcional: { estado: "vencida" | "sin_datos" } para limitar a uno.
export async function POST(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_COBRANZA);
  if (guard.response) return guard.response;

  const body = await req.json().catch(() => ({}));
  const estado = body?.estado;
  if (estado !== undefined && estado !== "vencida" && estado !== "sin_datos") {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const deudores = (await deudoresParaRecordar()).filter(
    (d) => !estado || d.estado === estado,
  );
  const conPush = deudores.filter((d) => d.conPush);

  await Promise.all(
    conPush.map((d) => enviarPushRecordatorio(d.usuarioId, d.estado, d.cuota)),
  );

  return NextResponse.json({
    ok: true,
    deudores: deudores.length,
    enviados: conPush.length,
    sinPush: deudores.length - conPush.length,
  });
}
