import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import { esGestor, GESTORES_AVISOS } from "@/lib/permisos";
import { TIPO_AVISO, VOTOS_PARA_RESOLVER, avisoVigente } from "@/lib/avisos";
import { nombreCorto } from "@/lib/oficios";
import { textoVencimiento, tiempoRelativo } from "@/lib/fechas";
import AccionesAviso from "@/components/avisos/AccionesAviso";

export const metadata = { title: "Avisos del barrio" };

export default async function AvisosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const usuarioId = getUserId(session);
  const esModerador = esGestor(session.user.role, GESTORES_AVISOS);

  const avisos = await prisma.aviso.findMany({
    where: avisoVigente(),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      autorId: true,
      tipo: true,
      ubicacion: true,
      detalle: true,
      imagen: true,
      venceAt: true,
      createdAt: true,
      autor: { select: { nombre: true, apellido: true } },
      confirmaciones: { select: { usuarioId: true, tipo: true } },
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avisos del barrio</h1>
          <p className="text-sm text-gray-500">
            Lo que pasa ahora en el barrio. Cada aviso se borra solo al vencer.
          </p>
        </div>
        <Link
          href="/avisos/nuevo"
          className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          + Dar un aviso
        </Link>
      </div>

      {avisos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 space-y-1">
          <p className="text-3xl" aria-hidden="true">
            ☀️
          </p>
          <p>No hay avisos por ahora. Todo tranquilo.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {avisos.map((a) => {
            const tipo = TIPO_AVISO[a.tipo];
            const sigue = a.confirmaciones.filter((c) => c.tipo === "SIGUE").length;
            const resuelto = a.confirmaciones.filter((c) => c.tipo === "RESUELTO").length;
            const mia =
              a.confirmaciones.find((c) => c.usuarioId === usuarioId)?.tipo ?? null;
            const esAutor = a.autorId === usuarioId;
            return (
              <li
                key={a.id}
                id={`aviso-${a.id}`}
                className={`scroll-mt-20 bg-white rounded-2xl border overflow-hidden ${
                  tipo.riesgo ? "border-amber-300" : "border-gray-200"
                }`}
              >
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={`text-sm font-bold ${tipo.riesgo ? "text-amber-800" : "text-blue-700"}`}
                    >
                      {tipo.emoji} {tipo.label}
                    </p>
                    <p className="text-xs text-gray-500 text-right flex-shrink-0">
                      {textoVencimiento(a.venceAt)}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">📍 {a.ubicacion}</p>
                  {a.detalle && (
                    <p className="text-gray-700 whitespace-pre-line">{a.detalle}</p>
                  )}
                  {a.imagen && (
                    <a
                      href={a.imagen}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-[16/9] rounded-xl overflow-hidden border border-gray-200"
                    >
                      <Image
                        src={a.imagen}
                        alt={`Foto del aviso: ${tipo.label}`}
                        fill
                        sizes="(max-width: 672px) 100vw, 640px"
                        className="object-cover"
                      />
                    </a>
                  )}
                  <p className="text-sm text-gray-500">
                    {esAutor ? "Vos" : nombreCorto(a.autor)} ·{" "}
                    {tiempoRelativo(a.createdAt)}
                    {sigue > 0 &&
                      ` · 👀 ${sigue} vecino${sigue === 1 ? "" : "s"} lo confirm${sigue === 1 ? "ó" : "aron"}`}
                    {resuelto > 0 &&
                      ` · ✅ ${resuelto} de ${VOTOS_PARA_RESOLVER} dicen que se resolvió`}
                  </p>
                  <AccionesAviso
                    avisoId={a.id}
                    esAutor={esAutor}
                    puedeBorrar={esAutor || esModerador}
                    miConfirmacion={mia}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-gray-500 text-center">
        ¿Hay que arreglar algo (una luminaria, una poda, un pozo)?{" "}
        <Link href="/requerimientos/nuevo" className="font-semibold text-blue-700">
          Cargá un requerimiento
        </Link>
      </p>
    </div>
  );
}
