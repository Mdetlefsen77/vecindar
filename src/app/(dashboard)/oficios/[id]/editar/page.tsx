import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { getUserId, parseId } from "@/lib/api/guard";
import OficioForm from "@/components/oficios/OficioForm";

export const metadata = { title: "Editar oficio" };

export default async function EditarOficioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = parseId((await params).id);
  if (id === null) notFound();
  const oficio = await prisma.oficio.findUnique({ where: { id } });
  // Solo el dueño edita: el admin modera, no reescribe la card de otro.
  if (!oficio || oficio.usuarioId !== getUserId(session)) {
    notFound();
  }

  // Activas + la actual (por si el admin la desactivó después de publicar).
  const categorias = await prisma.categoriaOficio.findMany({
    where: { OR: [{ activa: true }, { id: oficio.categoriaId }] },
    select: { id: true, nombre: true, grupo: true },
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href={`/oficios/${id}`} className="text-gray-500 hover:text-gray-600 text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar oficio</h1>
        {oficio.estado === "RECHAZADO" && (
          <p className="text-sm text-amber-800 mt-1">
            Al guardar, se vuelve a enviar a revisión.
          </p>
        )}
      </div>
      <OficioForm
        oficioId={id}
        categorias={categorias}
        inicial={{
          categoriaId: oficio.categoriaId,
          categoriaSugerida: oficio.categoriaSugerida,
          titulo: oficio.titulo,
          descripcion: oficio.descripcion,
          disponibilidad: oficio.disponibilidad,
          telefono: oficio.telefono,
          imagenes: oficio.imagenes,
        }}
      />
    </div>
  );
}
