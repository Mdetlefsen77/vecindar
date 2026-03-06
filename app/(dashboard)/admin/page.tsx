import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [
    totalUsuarios,
    pendientesVerif,
    incidentesActivos,
    requerimientosAbiertos,
    alertasPanico,
    totalLotes,
    lotesOcupados,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { verificado: false } }),
    prisma.incidente.count({ where: { estado: "ACTIVO" } }),
    prisma.requerimiento.count({
      where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
    }),
    prisma.alertaPanico.count({
      where: { estado: { in: ["ENVIADO", "RECIBIDO", "EN_ATENCION"] } },
    }),
    prisma.lote.count(),
    prisma.lote.count({ where: { usuario: { isNot: null } } }),
  ]);

  const stats = [
    {
      label: "Usuarios pendientes",
      value: pendientesVerif,
      total: totalUsuarios,
      href: "/admin/usuarios?verificado=false",
      color:
        pendientesVerif > 0
          ? "border-amber-400 bg-amber-50"
          : "border-gray-200 bg-white",
      icon: "👤",
      urgent: pendientesVerif > 0,
    },
    {
      label: "Incidentes activos",
      value: incidentesActivos,
      href: "/incidentes?estado=ACTIVO",
      color:
        incidentesActivos > 0
          ? "border-red-400 bg-red-50"
          : "border-gray-200 bg-white",
      icon: "🚨",
      urgent: incidentesActivos > 0,
    },
    {
      label: "Requerimientos abiertos",
      value: requerimientosAbiertos,
      href: "/requerimientos",
      color:
        requerimientosAbiertos > 0
          ? "border-blue-400 bg-blue-50"
          : "border-gray-200 bg-white",
      icon: "📋",
      urgent: false,
    },
    {
      label: "Alertas de pánico activas",
      value: alertasPanico,
      href: "/panico",
      color:
        alertasPanico > 0
          ? "border-red-600 bg-red-100"
          : "border-gray-200 bg-white",
      icon: "🆘",
      urgent: alertasPanico > 0,
    },
    {
      label: "Ocupación del barrio",
      value: lotesOcupados,
      total: totalLotes,
      href: "/mapa",
      color: "border-green-300 bg-green-50",
      icon: "🏘️",
      urgent: false,
    },
  ];

  // Últimos registros pendientes
  const ultimosPendientes = await prisma.usuario.findMany({
    where: { verificado: false },
    select: {
      id: true,
      nombre: true,
      email: true,
      createdAt: true,
      lote: { select: { numero: true, manzana: { select: { numero: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de administración
        </h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general del barrio</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`border-2 rounded-xl p-4 flex flex-col gap-1 hover:shadow-md transition-shadow ${s.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              {s.urgent && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 leading-none mt-1">
              {s.value}
              {s.total !== undefined && (
                <span className="text-base font-normal text-gray-400">
                  {" "}
                  / {s.total}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-600 font-medium">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Pendientes de verificación */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">
            Registros pendientes de aprobación
          </h2>
          <Link
            href="/admin/usuarios?verificado=false"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {ultimosPendientes.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            No hay registros pendientes ✅
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {ultimosPendientes.map((u) => (
              <Link
                key={u.id}
                href={`/admin/usuarios/${u.id}`}
                className="flex items-center justify-between p-3 bg-white hover:bg-amber-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {u.nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {u.email} · MZ {u.lote.manzana.numero} – Lote{" "}
                    {u.lote.numero}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Pendiente
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(u.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            {
              label: "Gestionar usuarios",
              href: "/admin/usuarios",
              icon: "👥",
            },
            { label: "Ver incidentes", href: "/incidentes", icon: "🔍" },
            { label: "Requerimientos", href: "/requerimientos", icon: "📋" },
            { label: "Mapa del barrio", href: "/mapa", icon: "🗺️" },
            { label: "Mascotas perdidas", href: "/mascotas", icon: "🐾" },
            { label: "Alertas de pánico", href: "/panico", icon: "🆘" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <span>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
