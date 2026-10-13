import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { esGestor, GESTORES_PARTES } from "@/lib/permisos";
import { TURNOS, turnoSugerido } from "@/lib/partes";
import ParteForm, { type SugerenciaNovedad } from "@/components/partes/ParteForm";
import type { TipoIncidente } from "@/generated/enums";

export const metadata = { title: "Cargar parte de turno" };

const TIPO_INCIDENTE_LABEL: Record<TipoIncidente, string> = {
  ROBO: "Robo",
  ROBO_TENTATIVA: "Intento de robo",
  SOSPECHOSO: "Actividad sospechosa",
  VANDALISMO: "Vandalismo",
  OTRO: "Incidente",
};

function hora(fecha: Date): string {
  return fecha.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function recortar(texto: string, max = 80): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Incidentes visibles y alertas SOS desde el último parte (como mucho, las
 * últimas 24 hs), para que la guardia los sume a las novedades sin reescribir.
 */
async function sugerenciasDeNovedades(): Promise<SugerenciaNovedad[]> {
  const ultimo = await prisma.parteTurno.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const hace24 = new Date(Date.now() - 24 * 3600_000);
  const desde =
    ultimo && ultimo.createdAt > hace24 ? ultimo.createdAt : hace24;

  const [incidentes, alertas] = await Promise.all([
    prisma.incidente.findMany({
      where: { createdAt: { gt: desde }, visibleVecinos: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        tipo: true,
        descripcion: true,
        createdAt: true,
        manzana: { select: { numero: true } },
      },
    }),
    prisma.alertaPanico.findMany({
      where: { createdAt: { gt: desde } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true },
    }),
  ]);

  return [
    ...incidentes.map((i) => ({
      clave: `inc-${i.id}`,
      fecha: i.createdAt,
      texto: `• ${hora(i.createdAt)} – ${TIPO_INCIDENTE_LABEL[i.tipo]}${
        i.manzana ? ` (Mz ${i.manzana.numero})` : ""
      }: ${recortar(i.descripcion)}`,
    })),
    ...alertas.map((a) => ({
      clave: `sos-${a.id}`,
      fecha: a.createdAt,
      texto: `• ${hora(a.createdAt)} – Alerta SOS activada`,
    })),
  ]
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map(({ clave, texto }) => ({ clave, texto }));
}

export default async function NuevoPartePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!esGestor(session.user.role, GESTORES_PARTES)) redirect("/partes");

  const { fecha, turno } = turnoSugerido();
  const sugerencias = await sugerenciasDeNovedades();

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/partes" className="text-gray-500 hover:text-gray-600 text-sm">
          ← Partes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Cargar parte de turno
        </h1>
      </div>
      <ParteForm
        sugerencias={sugerencias}
        inicial={{
          fecha,
          turno,
          ronda: "FINALIZADA",
          circulacion: "NORMAL",
          presenciaPolicial: false,
          recomendacion: TURNOS[turno].recomendacion,
          novedades: null,
          imagenes: [],
        }}
      />
    </div>
  );
}
