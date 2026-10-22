import { redirect } from "next/navigation";
import { preconnect, preload } from "react-dom";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import { esGestor, GESTORES_PANICO, VEN_DETALLE_LOTES } from "@/lib/permisos";
import { OSM_TILE_ORIGIN, mosaicoCentralUrl } from "@/lib/barrio/constantes";
import MapaCliente from "./MapaCliente";

export default async function MapaPage() {
  // Abre la conexión a los mosaicos y precarga el central (LCP) mientras
  // todavía baja Leaflet.
  preconnect(OSM_TILE_ORIGIN);
  preload(mosaicoCentralUrl(), { as: "image", fetchPriority: "high" });

  const session = await auth();
  if (!session?.user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: getUserId(session) },
    select: { lote: { select: { numero: true } } },
  });

  return (
    <MapaCliente
      miLote={usuario?.lote?.numero ?? null}
      verSos={esGestor(session.user.role, GESTORES_PANICO)}
      detalleLotes={esGestor(session.user.role, VEN_DETALLE_LOTES)}
    />
  );
}
