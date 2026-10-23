import { redirect } from "next/navigation";
import { preconnect, preload } from "react-dom";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { getUserId, parseId } from "@/lib/api/guard";
import { esGestor, GESTORES_PANICO, VEN_DETALLE_LOTES } from "@/lib/permisos";
import { OSM_TILE_ORIGIN, mosaicoCentralUrl } from "@/lib/barrio/constantes";
import { GRUPO_OFICIO } from "@/lib/oficios";
import MapaCliente from "./MapaCliente";

// Desde Oficios se llega con ?capa=oficios, y opcionalmente la manzana de un
// oficio (?manzana=5) o el rubro elegido en la lista (?rubro=<categoriaId>).
type SearchParams = Promise<{ capa?: string; manzana?: string; rubro?: string }>;

export default async function MapaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Abre la conexión a los mosaicos y precarga el central (LCP) mientras
  // todavía baja Leaflet.
  preconnect(OSM_TILE_ORIGIN);
  preload(mosaicoCentralUrl(), { as: "image", fetchPriority: "high" });

  const session = await auth();
  if (!session?.user) redirect("/login");

  const { capa, manzana, rubro } = await searchParams;
  const rubroId = parseId(rubro);

  const [usuario, oficios, categoria] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: getUserId(session) },
      select: { lote: { select: { numero: true } } },
    }),
    prisma.oficio.findMany({
      where: { estado: "APROBADO", ...(rubroId ? { categoriaId: rubroId } : {}) },
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
    rubroId
      ? prisma.categoriaOficio.findUnique({
          where: { id: rubroId },
          select: { nombre: true },
        })
      : null,
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
      soloOficios={capa === "oficios"}
      oficiosDe={manzana?.trim() || null}
      rubro={categoria?.nombre ?? null}
      verSos={esGestor(session.user.role, GESTORES_PANICO)}
      detalleLotes={esGestor(session.user.role, VEN_DETALLE_LOTES)}
    />
  );
}
