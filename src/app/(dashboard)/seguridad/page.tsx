import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";

export default async function SeguridadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "SEGURIDAD") {
    redirect("/");
  }

  const [incidentesActivos, requerimientosAbiertos, alertasPanico] =
    await Promise.all([
      prisma.incidente.count({ where: { estado: "ACTIVO" } }),
      prisma.requerimiento.count({
        where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
      }),
      prisma.alertaPanico.count({
        where: { estado: { in: ["ENVIADO", "RECIBIDO", "EN_ATENCION"] } },
      }),
    ]);

  const stats = [
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
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de Seguridad
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Seguimiento de incidentes, requerimientos y alertas del barrio
        </p>
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
            </p>
            <p className="text-xs text-gray-600 font-medium">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: "Ver incidentes", href: "/incidentes", icon: "🔍" },
            { label: "Requerimientos", href: "/requerimientos", icon: "📋" },
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
