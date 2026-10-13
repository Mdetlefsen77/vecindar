import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { parseId } from "@/lib/api/guard";
import { esGestor, GESTORES_PARTES } from "@/lib/permisos";
import ParteForm from "@/components/partes/ParteForm";

export const metadata = { title: "Editar parte de turno" };

export default async function EditarPartePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = parseId((await params).id);
  if (id === null) notFound();
  if (!esGestor(session.user.role, GESTORES_PARTES)) redirect(`/partes/${id}`);

  const parte = await prisma.parteTurno.findUnique({ where: { id } });
  if (!parte) notFound();

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link
          href={`/partes/${id}`}
          className="text-gray-500 hover:text-gray-600 text-sm"
        >
          ← Volver al parte
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Editar parte</h1>
      </div>
      <ParteForm
        parteId={id}
        inicial={{
          fecha: parte.fecha.toISOString().slice(0, 10),
          turno: parte.turno,
          ronda: parte.ronda,
          circulacion: parte.circulacion,
          presenciaPolicial: parte.presenciaPolicial,
          recomendacion: parte.recomendacion,
          novedades: parte.novedades,
          imagenes: parte.imagenes,
        }}
      />
    </div>
  );
}
