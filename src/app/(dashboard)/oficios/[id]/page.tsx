import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma/client";
import { getUserId, parseId } from "@/lib/api/guard";
import { esGestor, GESTORES_OFICIOS } from "@/lib/permisos";
import {
  ESTADO_OFICIO,
  GRUPO_OFICIO,
  mensajeContacto,
  nombreCorto,
  textoRecomendados,
} from "@/lib/oficios";
import { linkWhatsApp } from "@/lib/whatsapp";
import CompartirEnGrupo from "@/components/notificaciones-externas/CompartirEnGrupo";
import {
  BorrarOficio,
  ModerarOficio,
  RecomendarPanel,
  ReportarProblema,
} from "@/components/oficios/AccionesOficio";

export const metadata = { title: "Oficio" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
};

function fecha(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function OficioPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const usuarioId = getUserId(session);
  const esAdmin = esGestor(session.user.role, GESTORES_OFICIOS);

  const id = parseId((await params).id);
  if (id === null) notFound();
  const { nuevo } = await searchParams;

  const oficio = await prisma.oficio.findUnique({
    where: { id },
    include: {
      categoria: { select: { nombre: true, grupo: true } },
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          lote: { select: { manzana: { select: { numero: true } } } },
        },
      },
      recomendaciones: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          autorId: true,
          comentario: true,
          createdAt: true,
          autor: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });
  if (!oficio) notFound();

  const esDueno = oficio.usuarioId === usuarioId;
  // Sin aprobar, solo la ven el dueño y el admin.
  if (oficio.estado !== "APROBADO" && !esDueno && !esAdmin) notFound();

  const yaRecomendado = oficio.recomendaciones.some((r) => r.autorId === usuarioId);
  const cantidad = oficio.recomendaciones.length;
  const publicado = oficio.estado === "APROBADO";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/oficios" className="text-gray-500 hover:text-gray-600 text-sm">
          ← Oficios
        </Link>
        <p className="mt-2 text-sm font-semibold text-blue-700">
          {GRUPO_OFICIO[oficio.categoria.grupo].emoji} {oficio.categoria.nombre}
          {oficio.categoriaSugerida && (
            <span className="font-normal text-gray-500">
              {" "}
              (sugerido: {oficio.categoriaSugerida})
            </span>
          )}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{oficio.titulo}</h1>
        <p className="text-sm text-gray-500">
          {oficio.usuario.nombre} {oficio.usuario.apellido} · vecino de la Mz{" "}
          {oficio.usuario.lote.manzana.numero}
        </p>
      </div>

      {nuevo && (
        <div
          role="status"
          className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
        >
          ¡Listo! Tu publicación quedó en revisión. Te avisamos cuando esté
          publicada.
        </div>
      )}

      {!publicado && (esDueno || esAdmin) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm space-y-1">
          <p>
            Estado:{" "}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_OFICIO[oficio.estado].clase}`}
            >
              {ESTADO_OFICIO[oficio.estado].label}
            </span>
          </p>
          {oficio.motivoEstado && (
            <p className="text-gray-700">Motivo: {oficio.motivoEstado}</p>
          )}
          {oficio.estado === "RECHAZADO" && esDueno && (
            <p className="text-gray-600">
              Editala con los cambios y se vuelve a enviar a revisión.
            </p>
          )}
        </div>
      )}

      {publicado && !esDueno && (
        <a
          href={linkWhatsApp(oficio.telefono, mensajeContacto(oficio.titulo))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          💬 Contactar por WhatsApp
        </a>
      )}

      {publicado && (
        <CompartirEnGrupo
          tipoEvento="OFICIO"
          entidadId={oficio.id}
          etiqueta={esDueno ? "📤 Compartir mi oficio" : "📤 Compartir"}
          ayuda={
            esDueno
              ? "Compartilo en tus grupos para que más vecinos te conozcan."
              : "Pasáselo a quien lo necesite. El teléfono no va en el mensaje: se ve en la app."
          }
        />
      )}

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-gray-800 whitespace-pre-line">{oficio.descripcion}</p>
        {oficio.disponibilidad && (
          <p className="text-sm text-gray-600">🕒 {oficio.disponibilidad}</p>
        )}
      </section>

      {oficio.imagenes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Trabajos realizados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {oficio.imagenes.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square rounded-xl overflow-hidden border border-gray-200"
              >
                <Image
                  src={url}
                  alt={`Trabajo ${i + 1} de ${oficio.titulo}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2
          className={`font-bold ${cantidad > 0 ? "text-green-700" : "text-gray-500"}`}
        >
          {cantidad > 0 ? "👍 " : ""}
          {textoRecomendados(cantidad)}
        </h2>

        {publicado && !esDueno && (
          <RecomendarPanel oficioId={oficio.id} yaRecomendado={yaRecomendado} />
        )}

        {oficio.recomendaciones.length > 0 && (
          <ul className="space-y-2">
            {oficio.recomendaciones.map((r) => (
              <li
                key={r.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {nombreCorto(r.autor)}{" "}
                  <span className="font-normal text-gray-500">
                    · {fecha(r.createdAt)}
                  </span>
                </p>
                {r.comentario && (
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">
                    {r.comentario}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {esDueno && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={`/oficios/${oficio.id}/editar`}
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
          <BorrarOficio oficioId={oficio.id} />
        </div>
      )}

      {publicado && !esDueno && (
        <div className="pt-2 border-t border-gray-100">
          <ReportarProblema oficioId={oficio.id} />
        </div>
      )}

      {esAdmin && (
        <section className="rounded-2xl border border-gray-300 border-dashed p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Moderación (admin)</h2>
          <ModerarOficio
            oficioId={oficio.id}
            estado={oficio.estado}
            categoriaSugerida={oficio.categoriaSugerida}
          />
          {!esDueno && <BorrarOficio oficioId={oficio.id} />}
        </section>
      )}
    </div>
  );
}
