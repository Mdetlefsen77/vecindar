import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma/client";
import { esGestor, GESTORES_OFICIOS } from "@/lib/permisos";
import { GRUPO_OFICIO, nombreCorto } from "@/lib/oficios";
import { EditarFotosAdmin, ModerarOficio } from "@/components/oficios/AccionesOficio";
import { CategoriasAdmin, ResolverReporte } from "./Gestion";

export const metadata = { title: "Oficios — administración" };

function fecha(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    day: "numeric",
    month: "short",
  });
}

export default async function AdminOficiosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!esGestor(session.user.role, GESTORES_OFICIOS)) redirect("/");

  const [pendientes, reportes, categorias, publicados] = await Promise.all([
    prisma.oficio.findMany({
      where: { estado: "PENDIENTE" },
      orderBy: { createdAt: "asc" },
      include: {
        categoria: { select: { nombre: true, grupo: true } },
        usuario: {
          select: {
            nombre: true,
            apellido: true,
            lote: { select: { manzana: { select: { numero: true } } } },
          },
        },
      },
    }),
    prisma.reporteOficio.findMany({
      where: { resuelto: false },
      orderBy: { createdAt: "desc" },
      include: {
        autor: { select: { nombre: true, apellido: true } },
        oficio: { select: { id: true, titulo: true, estado: true } },
      },
    }),
    prisma.categoriaOficio.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        grupo: true,
        activa: true,
        _count: { select: { oficios: true } },
      },
    }),
    prisma.oficio.count({ where: { estado: "APROBADO" } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div>
        <Link href="/admin" className="text-gray-500 hover:text-gray-600 text-sm">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Oficios</h1>
        <p className="text-sm text-gray-500">
          {publicados} publicados · {pendientes.length} para revisar ·{" "}
          {reportes.length} reportes abiertos ·{" "}
          <Link href="/oficios" className="text-blue-600">
            ver catálogo
          </Link>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">
          Para revisar ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <p className="text-sm text-gray-500">No hay publicaciones pendientes.</p>
        ) : (
          pendientes.map((o) => (
            <article
              key={o.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
            >
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  {GRUPO_OFICIO[o.categoria.grupo].emoji} {o.categoria.nombre}
                </p>
                <Link
                  href={`/oficios/${o.id}`}
                  className="font-bold text-gray-900 hover:underline"
                >
                  {o.titulo}
                </Link>
                <p className="text-sm text-gray-500">
                  {o.usuario.nombre} {o.usuario.apellido} · Mz{" "}
                  {o.usuario.lote.manzana.numero} · tel. {o.telefono} ·{" "}
                  {fecha(o.createdAt)}
                </p>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-6">
                {o.descripcion}
              </p>
              {o.imagenes.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {o.imagenes.map((url) => (
                    <div
                      key={url}
                      className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200"
                    >
                      <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <EditarFotosAdmin
                oficioId={o.id}
                titulo={o.titulo}
                telefono={o.telefono}
                imagenes={o.imagenes}
              />
              <ModerarOficio
                oficioId={o.id}
                estado={o.estado}
                categoriaSugerida={o.categoriaSugerida}
              />
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">
          Reportes de problemas ({reportes.length})
        </h2>
        <p className="text-xs text-gray-500">
          Privados: el vecino reportado no los ve. Si una publicación acumula
          reportes, se puede pausar desde su página.
        </p>
        {reportes.length === 0 ? (
          <p className="text-sm text-gray-500">No hay reportes abiertos.</p>
        ) : (
          <ul className="space-y-2">
            {reportes.map((r) => (
              <li
                key={r.id}
                className="bg-white rounded-xl border border-gray-200 p-4 space-y-2"
              >
                <p className="text-sm">
                  <Link
                    href={`/oficios/${r.oficio.id}`}
                    className="font-semibold text-gray-900 hover:underline"
                  >
                    {r.oficio.titulo}
                  </Link>{" "}
                  <span className="text-gray-500">
                    · reportado por {nombreCorto(r.autor)} · {fecha(r.createdAt)}
                  </span>
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{r.detalle}</p>
                <ResolverReporte reporteId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">Rubros ({categorias.length})</h2>
        <CategoriasAdmin
          categorias={categorias.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            grupo: c.grupo,
            activa: c.activa,
            enUso: c._count.oficios,
          }))}
        />
      </section>
    </div>
  );
}
