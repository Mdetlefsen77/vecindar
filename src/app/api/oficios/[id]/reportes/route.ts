import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireSession, getUserId, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { reporteOficioSchema } from "@/lib/validation/oficios";
import { enviarPushSoloAdmin } from "@/lib/push/enviarPush";

type Params = { params: Promise<{ id: string }> };

// POST /api/oficios/[id]/reportes — "Reportar un problema". Privado: lo ve
// solo el admin, nunca el dueño ni los demás vecinos.
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const autorId = getUserId(guard.session);

  const id = parseId((await params).id);
  const oficio = id
    ? await prisma.oficio.findUnique({
        where: { id },
        select: { usuarioId: true, titulo: true },
      })
    : null;
  if (!oficio || oficio.usuarioId === autorId) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const parsed = reporteOficioSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return respuestaValidacion(parsed.error);

  await prisma.reporteOficio.create({
    data: { oficioId: id!, autorId, detalle: parsed.data.detalle },
  });

  void enviarPushSoloAdmin({
    title: "Reportaron un problema con un oficio",
    body: `Sobre "${oficio.titulo}". Revisalo en el panel de oficios.`,
    url: "/admin/oficios",
    tag: "oficios-reportes",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
