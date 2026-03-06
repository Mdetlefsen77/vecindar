import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import MascotasFiltros from "./MascotasFiltros";
import { type TipoAlertaMascota } from "@prisma/client";

type SearchParams = Promise<{ tipo?: string; estado?: string }>;

export default async function MascotasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tipo, estado } = await searchParams;

  const mascotas = await prisma.mascotaPerdida.findMany({
    where: {
      ...(tipo ? { tipo: tipo as TipoAlertaMascota } : {}),
      ...(estado === "abierta" ? { estado: true } : {}),
      ...(estado === "resuelta" ? { estado: false } : {}),
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
    },
    orderBy: [{ estado: "desc" }, { createdAt: "desc" }],
  });

  const abiertas = mascotas.filter((m) => m.estado).length;

  // Card color state mapping
  const getCardStyle = (
    estado: boolean,
    tipo: (typeof mascotas)[0]["tipo"],
  ) => {
    if (!estado) return "border-gray-200 bg-gray-50 opacity-70";
    return tipo === "PERDIDA"
      ? "border-orange-200 bg-orange-50"
      : "border-green-200 bg-green-50";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mascotas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mascotas.length} alerta{mascotas.length !== 1 ? "s" : ""}
            {abiertas > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                · {abiertas} buscando
              </span>
            )}
          </p>
        </div>
        <Link
          href="/mascotas/nuevo"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Publicar
        </Link>
      </div>

      {/* Filtros */}
      <Suspense>
        <MascotasFiltros />
      </Suspense>

      {/* Listado */}
      {mascotas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🐾</div>
          <p className="font-medium">No hay alertas con esos filtros.</p>
          <Link
            href="/mascotas/nuevo"
            className="text-blue-500 text-sm hover:underline mt-2 block"
          >
            Publicar una alerta →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {mascotas.map((m) => (
            <Link
              key={m.id}
              href={`/mascotas/${m.id}`}
              className={`block rounded-xl border-2 p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow ${getCardStyle(m.estado, m.tipo)}`}
            >
              <div className="flex items-start gap-3">
                {/* Foto o placeholder */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border border-gray-200 flex items-center justify-center text-3xl">
                  {m.foto ? (
                    <Image
                      src={m.foto}
                      alt={m.nombre ?? "mascota"}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : m.tipo === "PERDIDA" ? (
                    "🐾"
                  ) : (
                    "🐶"
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            m.tipo === "PERDIDA"
                              ? "bg-orange-200 text-orange-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {m.tipo === "PERDIDA"
                            ? "🐾 Perdida"
                            : "✅ Encontrada"}
                        </span>
                        {!m.estado && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                            Resuelta
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 mt-1">
                        {m.nombre ??
                          (m.tipo === "PERDIDA"
                            ? "Sin nombre"
                            : "Mascota encontrada")}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">
                      {new Date(m.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {m.descripcion}
                  </p>

                  {/* Zona + autor */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-gray-500">📍 {m.zona}</span>
                    <span className="text-xs text-gray-400">
                      por {m.usuario.nombre} · MZ{" "}
                      {m.usuario.lote.manzana.numero}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
