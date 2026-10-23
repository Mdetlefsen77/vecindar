import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, parseId } from "@/lib/api/guard";
import { respuestaValidacion } from "@/lib/api/validation";
import { GESTORES_OFICIOS } from "@/lib/permisos";
import { moderarOficioSchema } from "@/lib/validation/oficios";
import { enviarPushUsuario } from "@/lib/push/enviarPush";
import type { EstadoOficio } from "@/generated/enums";

type Params = { params: Promise<{ id: string }> };

const TRANSICIONES: Record<
  "aprobar" | "rechazar" | "pausar" | "reactivar",
  { desde: EstadoOficio[]; hacia: EstadoOficio }
> = {
  aprobar: { desde: ["PENDIENTE"], hacia: "APROBADO" },
  rechazar: { desde: ["PENDIENTE"], hacia: "RECHAZADO" },
  pausar: { desde: ["APROBADO"], hacia: "PAUSADO" },
  reactivar: { desde: ["PAUSADO"], hacia: "APROBADO" },
};

// POST /api/oficios/[id]/estado — moderación (ADMIN). Avisa al dueño por push.
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireRoleSession(GESTORES_OFICIOS);
  if (guard.response) return guard.response;

  const id = parseId((await params).id);
  const oficio = id
    ? await prisma.oficio.findUnique({
        where: { id },
        select: { estado: true, usuarioId: true, titulo: true, aprobadoAt: true },
      })
    : null;
  if (!oficio) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const parsed = moderarOficioSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return respuestaValidacion(parsed.error);
  const { accion, motivo, categoriaId } = parsed.data;

  const t = TRANSICIONES[accion];
  if (!t.desde.includes(oficio.estado)) {
    return NextResponse.json(
      { error: "La publicación cambió de estado. Recargá la página." },
      { status: 409 },
    );
  }
  if ((accion === "rechazar" || accion === "pausar") && !motivo) {
    return NextResponse.json(
      { error: "Escribí el motivo: lo va a ver el vecino." },
      { status: 400 },
    );
  }
  if (categoriaId) {
    const existe = await prisma.categoriaOficio.findUnique({
      where: { id: categoriaId },
      select: { id: true },
    });
    if (!existe) {
      return NextResponse.json({ error: "Rubro inválido." }, { status: 400 });
    }
  }

  await prisma.oficio.update({
    where: { id: id! },
    data: {
      estado: t.hacia,
      motivoEstado: t.hacia === "APROBADO" ? null : motivo,
      ...(accion === "aprobar" && !oficio.aprobadoAt
        ? { aprobadoAt: new Date() }
        : {}),
      ...(categoriaId ? { categoriaId, categoriaSugerida: null } : {}),
    },
  });

  const aviso = {
    aprobar: {
      title: "¡Tu publicación ya está a la vista!",
      body: `"${oficio.titulo}" ya aparece en Oficios y servicios del barrio.`,
    },
    reactivar: {
      title: "Tu publicación volvió a estar a la vista",
      body: `"${oficio.titulo}" ya aparece de nuevo en el catálogo.`,
    },
    rechazar: {
      title: "Tu publicación necesita cambios",
      body: `"${oficio.titulo}": ${motivo}`,
    },
    pausar: {
      title: "Tu publicación fue pausada",
      body: `"${oficio.titulo}": ${motivo}`,
    },
  }[accion];
  void enviarPushUsuario(oficio.usuarioId, {
    ...aviso,
    url: `/oficios/${id}`,
    tag: `oficio-${id}`,
  });

  return NextResponse.json({ ok: true, estado: t.hacia });
}
