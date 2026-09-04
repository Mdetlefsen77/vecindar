import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import { tiempoRelativo, enLinea } from "@/lib/fechas";
import Link from "next/link";
import { Suspense } from "react";
import UsuariosFiltros from "./UsuariosFiltros";
import { type Rol } from "@/generated/enums";
import type { Prisma } from "@/generated/client";

const ROL_CONFIG: Record<Rol, { label: string; bg: string; text: string }> = {
  VECINO: { label: "Vecino", bg: "bg-gray-100", text: "text-gray-600" },
  REFERENTE_MANZANA: {
    label: "Referente",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  SEGURIDAD: {
    label: "Seguridad",
    bg: "bg-orange-100",
    text: "text-orange-700",
  },
  TESORERO: {
    label: "Tesorero",
    bg: "bg-teal-100",
    text: "text-teal-700",
  },
  ADMIN: { label: "Admin", bg: "bg-purple-100", text: "text-purple-700" },
};

type SearchParams = Promise<{
  rol?: string;
  verificado?: string;
  q?: string;
  actividad?: string;
}>;

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const { rol, verificado, q, actividad } = await searchParams;

  // "ahora" es determinista para la request (react-hooks/purity apunta a cliente).
  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now();
  const hace7d = new Date(ahora - 7 * 86_400_000);
  const hace30d = new Date(ahora - 30 * 86_400_000);

  // Cada filtro es un AND independiente para no pisar la clave `OR` entre sí
  // (búsqueda de texto vs. "inactivos").
  const filtros: Prisma.UsuarioWhereInput[] = [];
  if (rol) filtros.push({ rol: rol as Rol });
  if (verificado !== undefined)
    filtros.push({ verificado: verificado === "true" });
  if (q)
    filtros.push({
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  if (actividad === "7d")
    filtros.push({ ultimaActividadAt: { gte: hace7d } });
  else if (actividad === "30d")
    filtros.push({ ultimaActividadAt: { gte: hace30d } });
  else if (actividad === "inactivos")
    filtros.push({
      OR: [
        { ultimaActividadAt: null },
        { ultimaActividadAt: { lt: hace30d } },
      ],
    });

  const usuarios = await prisma.usuario.findMany({
    where: filtros.length ? { AND: filtros } : {},
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
      rol: true,
      verificado: true,
      createdAt: true,
      ultimoLoginAt: true,
      ultimaActividadAt: true,
      lote: {
        select: {
          numero: true,
          manzana: { select: { numero: true, zona: true } },
        },
      },
      _count: { select: { incidentes: true, requerimientos: true } },
    },
    orderBy: [{ verificado: "asc" }, { createdAt: "desc" }],
  });

  const pendientes = usuarios.filter((u) => !u.verificado).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ← Admin
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Usuarios</h1>
          <p className="text-sm text-gray-500">
            {usuarios.length} usuarios
            {pendientes > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {pendientes} pendiente{pendientes > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros — client component */}
      <Suspense>
        <UsuariosFiltros />
      </Suspense>

      {/* Tabla */}
      {usuarios.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No se encontraron usuarios con esos filtros.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Header — solo desktop */}
          <div className="hidden sm:grid grid-cols-[1fr_1.4fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Nombre</span>
            <span>Email</span>
            <span>Lote</span>
            <span>Rol</span>
            <span>Estado</span>
            <span>Actividad</span>
          </div>

          <div className="divide-y divide-gray-100">
            {usuarios.map((u) => {
              const rol = ROL_CONFIG[u.rol];
              return (
                <Link
                  key={u.id}
                  href={`/admin/usuarios/${u.id}`}
                  className={`grid sm:grid-cols-[1fr_1.4fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                    !u.verificado
                      ? "bg-amber-50 hover:bg-amber-100"
                      : "bg-white"
                  }`}
                >
                  {/* Nombre */}
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {enLinea(u.ultimaActividadAt) && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle"
                          title="En línea"
                        />
                      )}
                      {nombreCompleto(u)}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {u._count.incidentes} incidente
                      {u._count.incidentes !== 1 ? "s" : ""} ·{" "}
                      {u._count.requerimientos} req.
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                      Última actividad: {tiempoRelativo(u.ultimaActividadAt)}
                    </p>
                  </div>

                  {/* Email — solo desktop */}
                  <p className="hidden sm:block text-sm text-gray-600 truncate">
                    {u.email}
                  </p>

                  {/* Lote */}
                  <p className="text-sm text-gray-700 font-mono whitespace-nowrap">
                    MZ {u.lote.manzana.numero} – {u.lote.numero}
                  </p>

                  {/* Rol */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${rol.bg} ${rol.text}`}
                  >
                    {rol.label}
                  </span>

                  {/* Estado */}
                  {u.verificado ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                      Pendiente
                    </span>
                  )}

                  {/* Actividad — solo desktop (en mobile va bajo el nombre) */}
                  <span
                    className="hidden sm:block text-xs text-gray-500 whitespace-nowrap"
                    title={
                      u.ultimoLoginAt
                        ? `Último login: ${new Date(u.ultimoLoginAt).toLocaleString("es-AR")}`
                        : "Sin logins registrados"
                    }
                  >
                    {tiempoRelativo(u.ultimaActividadAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
