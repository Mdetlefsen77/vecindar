import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import { MAX_OFICIOS_POR_USUARIO } from "@/lib/oficios";
import OficioForm from "@/components/oficios/OficioForm";

export const metadata = { title: "Publicar mi oficio o servicio" };

export default async function NuevoOficioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const usuarioId = getUserId(session);

  const [usuario, activos, categorias] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { telefono: true },
    }),
    prisma.oficio.count({ where: { usuarioId, estado: { not: "RECHAZADO" } } }),
    prisma.categoriaOficio.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, grupo: true },
    }),
  ]);
  if (activos >= MAX_OFICIOS_POR_USUARIO) redirect("/oficios");

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/oficios" className="text-gray-500 hover:text-gray-600 text-sm">
          ← Oficios y servicios
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Publicar mi oficio o servicio</h1>
        <p className="text-sm text-gray-500">
          Contale al barrio qué servicio ofrecés. Los vecinos que te contraten
          van a poder recomendarte.
        </p>
      </div>
      <OficioForm
        categorias={categorias}
        inicial={{
          categoriaId: null,
          categoriaSugerida: null,
          titulo: "",
          descripcion: "",
          disponibilidad: null,
          telefono: usuario?.telefono ?? "",
          imagenes: [],
        }}
      />
    </div>
  );
}
