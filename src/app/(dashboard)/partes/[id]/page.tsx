import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma/client";
import { parseId } from "@/lib/api/guard";
import { esGestor, GESTORES_PARTES } from "@/lib/permisos";
import {
  CIRCULACION_LABEL,
  RONDA_LABEL,
  TURNOS,
  fechaParteLabel,
  horarioTurno,
} from "@/lib/partes";
import CompartirParte from "@/components/partes/CompartirParte";

export const metadata = { title: "Parte de turno" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
};

export default async function PartePage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = parseId((await params).id);
  if (id === null) notFound();
  const { nuevo } = await searchParams;

  const parte = await prisma.parteTurno.findUnique({
    where: { id },
    include: { autor: { select: { nombre: true } } },
  });
  if (!parte) notFound();

  const puedeEditar = esGestor(session.user.role, GESTORES_PARTES);
  const filas = [
    { icono: "⭕", label: "Ronda de patrullaje", valor: RONDA_LABEL[parte.ronda] },
    {
      icono: "🛵",
      label: "Circulación barrial",
      valor: CIRCULACION_LABEL[parte.circulacion],
    },
    {
      icono: "👮🏻",
      label: "Presencia policial",
      valor: parte.presenciaPolicial ? "Sí" : "No",
    },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/partes" className="text-gray-500 hover:text-gray-600 text-sm">
          ← Partes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          📌 Turno {TURNOS[parte.turno].label.toLowerCase()}
        </h1>
        <p className="text-sm text-gray-500 first-letter:uppercase">
          {fechaParteLabel(parte.fecha)} · {horarioTurno(parte.turno)} ·
          cargado por {parte.autor.nombre}
        </p>
      </div>

      {nuevo && (
        <div
          role="status"
          className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
        >
          Parte guardado ✓ — compartilo en el grupo de seguridad.
        </div>
      )}

      <dl className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {filas.map((f) => (
          <div key={f.label} className="flex justify-between gap-3 px-4 py-3">
            <dt className="text-sm text-gray-600">
              <span aria-hidden="true">{f.icono} </span>
              {f.label}
            </dt>
            <dd className="text-sm font-semibold text-gray-900">{f.valor}</dd>
          </div>
        ))}
      </dl>

      <div
        className={`rounded-2xl border px-4 py-3 ${
          parte.novedades
            ? "bg-amber-50 border-amber-200"
            : "bg-green-50 border-green-200"
        }`}
      >
        <h2 className="text-sm font-bold text-gray-900">
          📝 {parte.novedades ? "Novedades" : "Sin novedades"}
        </h2>
        {parte.novedades && (
          <p className="mt-1 text-sm text-gray-800 whitespace-pre-line">
            {parte.novedades}
          </p>
        )}
      </div>

      {parte.recomendacion && (
        <p className="text-sm text-gray-700">
          ⚠️ <em>{parte.recomendacion}</em>
        </p>
      )}

      {parte.imagenes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {parte.imagenes.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-200"
            >
              <Image
                src={url}
                alt={`Foto ${i + 1} del parte`}
                fill
                sizes="(max-width: 640px) 50vw, 190px"
                className="object-cover"
              />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
        <CompartirParte parteId={parte.id} imagenes={parte.imagenes} />
        {puedeEditar && (
          <Link
            href={`/partes/${parte.id}/editar`}
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
        )}
      </div>
    </div>
  );
}
