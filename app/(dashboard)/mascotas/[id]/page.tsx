import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import AccionesMascota from "./AccionesMascota";

type Params = { params: Promise<{ id: string }> };

export default async function DetalleMascotaPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const mascota = await prisma.mascotaPerdida.findUnique({
    where: { id: parseInt(id) },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          telefono: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
    },
  });

  if (!mascota) notFound();

  const esDuenio = parseInt(session.user.id!) === mascota.usuario.id;
  const esAdmin = session.user.role === "ADMIN";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Breadcrumb */}
      <Link
        href="/mascotas"
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← Mascotas
      </Link>

      {/* Estado badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-sm px-3 py-1 rounded-full font-semibold ${
            mascota.tipo === "PERDIDA"
              ? "bg-orange-100 text-orange-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {mascota.tipo === "PERDIDA"
            ? "🐾 Mascota perdida"
            : "✅ Mascota encontrada"}
        </span>
        {!mascota.estado && (
          <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
            Resuelta
          </span>
        )}
      </div>

      {/* Foto */}
      {mascota.foto && (
        <div className="rounded-xl overflow-hidden border border-gray-200 max-h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mascota.foto}
            alt={mascota.nombre ?? "mascota"}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Info principal */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mascota.nombre ??
              (mascota.tipo === "PERDIDA"
                ? "Sin nombre"
                : "Mascota encontrada")}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Publicado el{" "}
            {new Date(mascota.createdAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Descripción */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Descripción
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {mascota.descripcion}
          </p>
        </div>

        {/* Zona */}
        <div className="flex items-start gap-2 p-4 rounded-xl bg-gray-50">
          <span className="text-xl">📍</span>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {mascota.tipo === "PERDIDA"
                ? "Última vez vista en"
                : "Encontrada en"}
            </p>
            <p className="text-sm text-gray-800 mt-0.5">{mascota.zona}</p>
          </div>
        </div>

        {/* Contacto */}
        <div className="flex items-start gap-2 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <span className="text-xl">📞</span>
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
              Contacto
            </p>
            <p className="text-sm text-blue-800 font-medium mt-0.5">
              {mascota.contacto}
            </p>
          </div>
        </div>

        {/* Publicado por */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
            {mascota.usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {mascota.usuario.nombre}
            </p>
            <p className="text-xs text-gray-400">
              MZ {mascota.usuario.lote.manzana.numero} – Lote{" "}
              {mascota.usuario.lote.numero}
            </p>
          </div>
          {esDuenio && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              Tu publicación
            </span>
          )}
        </div>

        {/* Fecha resolución */}
        {mascota.resueltaAt && (
          <p className="text-xs text-center text-gray-400">
            Resuelta el{" "}
            {new Date(mascota.resueltaAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Acciones (dueño o admin) */}
      <AccionesMascota
        mascotaId={mascota.id}
        estadoActual={mascota.estado}
        esDuenio={esDuenio}
        esAdmin={esAdmin}
      />
    </div>
  );
}
