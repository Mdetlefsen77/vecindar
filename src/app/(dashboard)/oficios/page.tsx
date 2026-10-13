import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma/client";
import { getUserId, parseId } from "@/lib/api/guard";
import {
  ESTADO_OFICIO,
  GRUPO_OFICIO,
  MAX_OFICIOS_POR_USUARIO,
  agruparCategorias,
  textoRecomendados,
} from "@/lib/oficios";
import type { Prisma } from "@/generated/client";

export const metadata = { title: "Oficios del barrio" };

type SearchParams = Promise<{ q?: string; categoria?: string }>;

export default async function OficiosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const usuarioId = getUserId(session);

  const { q, categoria } = await searchParams;
  const texto = q?.trim() ?? "";
  const categoriaId = parseId(categoria);

  const filtro: Prisma.OficioWhereInput = {
    estado: "APROBADO",
    ...(categoriaId ? { categoriaId } : {}),
    ...(texto
      ? {
          OR: [
            { titulo: { contains: texto, mode: "insensitive" } },
            { descripcion: { contains: texto, mode: "insensitive" } },
            { categoria: { nombre: { contains: texto, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [oficios, mios, categoriasEnUso] = await Promise.all([
    prisma.oficio.findMany({
      where: filtro,
      orderBy: [{ recomendaciones: { _count: "desc" } }, { aprobadoAt: "desc" }],
      take: 100,
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        imagenes: true,
        categoria: { select: { nombre: true, grupo: true } },
        usuario: {
          select: {
            nombre: true,
            apellido: true,
            lote: { select: { manzana: { select: { numero: true } } } },
          },
        },
        _count: { select: { recomendaciones: true } },
      },
    }),
    prisma.oficio.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        titulo: true,
        estado: true,
        motivoEstado: true,
        _count: { select: { recomendaciones: true } },
      },
    }),
    // El filtro ofrece solo rubros con al menos un oficio publicado.
    prisma.categoriaOficio.findMany({
      where: { oficios: { some: { estado: "APROBADO" } } },
      select: { id: true, nombre: true, grupo: true },
    }),
  ]);

  const puedePublicar =
    mios.filter((o) => o.estado !== "RECHAZADO").length < MAX_OFICIOS_POR_USUARIO;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oficios del barrio</h1>
          <p className="text-sm text-gray-500">
            Servicios que ofrecen los vecinos, recomendados por quienes los
            contrataron
          </p>
        </div>
        {puedePublicar && (
          <Link
            href="/oficios/nuevo"
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            + Publicar mi oficio
          </Link>
        )}
      </div>

      {mios.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Mis publicaciones</h2>
          <ul className="divide-y divide-gray-100">
            {mios.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/oficios/${o.id}`}
                  className="flex items-center justify-between gap-3 py-2 hover:bg-gray-50 rounded-lg px-1"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {o.titulo}
                    </span>
                    {o.motivoEstado && (
                      <span className="block text-xs text-gray-500 truncate">
                        {o.motivoEstado}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {o.estado === "APROBADO" && (
                      <span className="text-xs text-gray-500">
                        👍 {o._count.recomendaciones}
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_OFICIO[o.estado].clase}`}
                    >
                      {ESTADO_OFICIO[o.estado].label}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Formulario GET: funciona sin JS y deja el filtro en la URL. */}
      <form className="flex flex-col sm:flex-row gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={texto}
          placeholder="Buscar: plomero, clases de inglés, tortas…"
          aria-label="Buscar oficios"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-base"
        />
        <select
          name="categoria"
          defaultValue={categoriaId ?? ""}
          aria-label="Filtrar por rubro"
          className="sm:w-64 border border-gray-300 rounded-xl px-3 py-2.5 text-base bg-white"
        >
          <option value="">Todos los rubros</option>
          {agruparCategorias(categoriasEnUso).map((g) => (
            <optgroup
              key={g.grupo}
              label={`${GRUPO_OFICIO[g.grupo].emoji} ${GRUPO_OFICIO[g.grupo].label}`}
            >
              {g.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700"
        >
          Buscar
        </button>
      </form>

      {oficios.length === 0 ? (
        <div className="text-center py-12 text-gray-500 space-y-2">
          <p>
            {texto || categoriaId
              ? "No encontramos oficios con ese filtro."
              : "Todavía no hay oficios publicados."}
          </p>
          {(texto || categoriaId) && (
            <Link href="/oficios" className="text-blue-600 text-sm font-semibold">
              Ver todos
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {oficios.map((o) => (
            <li key={o.id}>
              <Link
                href={`/oficios/${o.id}`}
                className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {o.imagenes[0] ? (
                  <div className="relative aspect-[16/9] bg-gray-100">
                    <Image
                      src={o.imagenes[0]}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-20 bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center text-4xl"
                  >
                    {GRUPO_OFICIO[o.categoria.grupo].emoji}
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-1 p-4">
                  <p className="text-xs font-semibold text-blue-700">
                    {o.categoria.nombre}
                  </p>
                  <h2 className="font-bold text-gray-900 leading-snug">{o.titulo}</h2>
                  <p className="text-sm text-gray-600 line-clamp-2">{o.descripcion}</p>
                  <p className="mt-auto pt-2 text-sm text-gray-500">
                    {o.usuario.nombre} {o.usuario.apellido} · Mz{" "}
                    {o.usuario.lote.manzana.numero}
                  </p>
                  <p
                    className={`text-sm font-semibold ${o._count.recomendaciones > 0 ? "text-green-700" : "text-gray-400"}`}
                  >
                    {o._count.recomendaciones > 0 ? "👍 " : ""}
                    {textoRecomendados(o._count.recomendaciones)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
