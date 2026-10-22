import { redirect } from "next/navigation";
import { preconnect, preload } from "react-dom";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import { esGestor, GESTORES_PANICO, VEN_DETALLE_LOTES } from "@/lib/permisos";
import { OSM_TILE_ORIGIN, mosaicoCentralUrl } from "@/lib/barrio/constantes";
import { GRUPO_OFICIO } from "@/lib/oficios";
import MapaCliente from "./MapaCliente";

export default async function MapaPage() {
  // Abre la conexión a los mosaicos y precarga el central (LCP) mientras
  // todavía baja Leaflet.
  preconnect(OSM_TILE_ORIGIN);
  preload(mosaicoCentralUrl(), { as: "image", fetchPriority: "high" });

  const session = await auth();
  if (!session?.user) redirect("/login");

  const [usuario, oficios] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: getUserId(session) },
      select: { lote: { select: { numero: true } } },
    }),
    prisma.oficio.findMany({
      where: { estado: "APROBADO" },
      orderBy: [{ recomendaciones: { _count: "desc" } }, { aprobadoAt: "desc" }],
      select: {
        id: true,
        titulo: true,
        categoria: { select: { nombre: true, grupo: true } },
        // Solo la manzana, como en /oficios: no en qué casa vive cada uno.
        usuario: {
          select: { lote: { select: { manzana: { select: { numero: true } } } } },
        },
        _count: { select: { recomendaciones: true } },
      },
    }),
  ]);

  return (
    <MapaCliente
      miLote={usuario?.lote?.numero ?? null}
      oficios={oficios.map((o) => ({
        id: o.id,
        titulo: o.titulo,
        categoria: o.categoria.nombre,
        emoji: GRUPO_OFICIO[o.categoria.grupo].emoji,
        manzana: o.usuario.lote.manzana.numero,
        recomendaciones: o._count.recomendaciones,
      }))}
      verSos={esGestor(session.user.role, GESTORES_PANICO)}
      detalleLotes={esGestor(session.user.role, VEN_DETALLE_LOTES)}
    />
  );
}
