import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import { getUserId } from "@/lib/api/guard";
import { marcarSeccionVista } from "@/lib/vistas";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import MascotasFiltros from "./MascotasFiltros";
import { type TipoAlertaMascota } from "@/generated/enums";

type SearchParams = Promise<{ tipo?: string; estado?: string }>;

export default async function MascotasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  after(() => marcarSeccionVista(getUserId(session), "MASCOTAS"));

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
          apellido: true,
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
    if (!estado)
      return "border border-l-4 border-l-gray-300 border-gray-200 bg-white";
    return tipo === "PERDIDA"
      ? "border border-l-4 border-l-orange-400 border-gray-200 bg-orange-50"
      : "border border-l-4 border-l-green-500 border-gray-200 bg-green-50";
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

      {/* Empty state */}
      {mascotas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5C8 2.67 8.67 2 9.5 2S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5zm8 5c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5zm-11 0C5.67 15 5 14.33 5 13.5v-3C5 9.67 5.67 9 6.5 9S8 9.67 8 10.5v3c0 .83-.67 1.5-1.5 1.5zm5.5 5c-2.5 0-6-2.5-6-6 0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5 0 3.5-3.5 6-6 6z"
            />
          </svg>
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
              className={`block rounded-xl p-4 sm:p-5 hover:shadow-md transition-all group ${getCardStyle(m.estado, m.tipo)}`}
            >
              <div className="flex items-start gap-3">
                {/* Foto o placeholder */}
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white border border-gray-200 flex items-center justify-center">
                  {m.foto ? (
                    <Image
                      src={m.foto}
                      alt={m.nombre ?? "mascota"}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-7 h-7 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5C8 2.67 8.67 2 9.5 2S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5zm8 5c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5zm-11 0C5.67 15 5 14.33 5 13.5v-3C5 9.67 5.67 9 6.5 9S8 9.67 8 10.5v3c0 .83-.67 1.5-1.5 1.5zm5.5 5c-2.5 0-6-2.5-6-6 0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5 0 3.5-3.5 6-6 6z"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            m.tipo === "PERDIDA"
                              ? "bg-orange-200 text-orange-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {m.tipo === "PERDIDA" ? "Perdida" : "Encontrada"}
                        </span>
                        {!m.estado && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                            Resuelta
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 mt-1 text-[15px]">
                        {m.nombre ??
                          (m.tipo === "PERDIDA"
                            ? "Sin nombre"
                            : "Mascota encontrada")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs text-gray-500">
                        {new Date(m.createdAt).toLocaleDateString("es-AR")}
                      </p>
                      <svg
                        className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {m.descripcion}
                  </p>

                  {/* Zona + autor */}
                  <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-black/5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {m.zona}
                    </span>
                    <span className="text-xs text-gray-500">
                      por {nombreCompleto(m.usuario)} · MZ{" "}
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
