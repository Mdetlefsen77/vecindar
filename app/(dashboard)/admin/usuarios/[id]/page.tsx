import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import AccionesUsuario from "./AccionesUsuario";

const TIPO_ICON: Record<string, string> = {
  ROBO: "🔴",
  ROBO_TENTATIVA: "🟠",
  SOSPECHOSO: "🟡",
  VANDALISMO: "🟣",
  OTRO: "⚫",
};
const CATEGORIA_ICON: Record<string, string> = {
  ILUMINACION: "💡",
  PODA: "🌳",
  CALLES: "🛣️",
  LIMPIEZA: "🧹",
  SEGURIDAD: "🔒",
  INFRAESTRUCTURA: "🔧",
  OTRO: "📋",
};

type Params = { params: Promise<{ id: string }> };

export default async function DetalleUsuarioPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const userId = parseInt(id);

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      rol: true,
      verificado: true,
      createdAt: true,
      lote: {
        select: {
          id: true,
          numero: true,
          calleFrente: true,
          area: true,
          manzana: { select: { numero: true, zona: true } },
        },
      },
      incidentes: {
        select: {
          id: true,
          tipo: true,
          estado: true,
          fechaHora: true,
          descripcion: true,
        },
        orderBy: { fechaHora: "desc" },
        take: 5,
      },
      requerimientos: {
        select: {
          id: true,
          categoria: true,
          titulo: true,
          estado: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: { incidentes: true, requerimientos: true, alertasPanico: true },
      },
    },
  });

  if (!usuario) notFound();

  const esUnoMismo = session.user.id === String(usuario.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-gray-600">
          Admin
        </Link>
        <span>›</span>
        <Link href="/admin/usuarios" className="hover:text-gray-600">
          Usuarios
        </Link>
        <span>›</span>
        <span className="text-gray-700">{usuario.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{usuario.nombre}</h1>
          <p className="text-gray-500 text-sm">{usuario.email}</p>
          {usuario.telefono && (
            <p className="text-gray-500 text-sm">{usuario.telefono}</p>
          )}
        </div>
        <div className="text-right space-y-1 shrink-0">
          <p className="text-xs text-gray-400">
            Registrado el{" "}
            {new Date(usuario.createdAt).toLocaleDateString("es-AR")}
          </p>
          {!usuario.verificado && (
            <span className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Pendiente de aprobación
            </span>
          )}
        </div>
      </div>

      {/* Info lote */}
      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Manzana
          </p>
          <p className="font-semibold mt-0.5">
            MZ {usuario.lote.manzana.numero}
          </p>
          <p className="text-xs text-gray-400">{usuario.lote.manzana.zona}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Lote
          </p>
          <p className="font-semibold mt-0.5">#{usuario.lote.numero}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Calle
          </p>
          <p className="font-semibold mt-0.5 text-xs">
            {usuario.lote.calleFrente}
          </p>
        </div>
        {usuario.lote.area && (
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Área
            </p>
            <p className="font-semibold mt-0.5">{usuario.lote.area} m²</p>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Incidentes",
            value: usuario._count.incidentes,
            href: `/incidentes`,
          },
          {
            label: "Requerimientos",
            value: usuario._count.requerimientos,
            href: `/requerimientos`,
          },
          {
            label: "Alertas pánico",
            value: usuario._count.alertasPanico,
            href: `/panico`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-xl p-3 text-center"
          >
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Panel de acciones — client component */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">
          Acciones de administración
        </h2>
        <AccionesUsuario
          usuarioId={usuario.id}
          rolActual={usuario.rol}
          verificado={usuario.verificado}
          esUnoMismo={esUnoMismo}
        />
      </div>

      {/* Últimos incidentes */}
      {usuario.incidentes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">
            Últimos incidentes reportados
          </h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {usuario.incidentes.map((inc) => (
              <Link
                key={inc.id}
                href={`/incidentes/${inc.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">{TIPO_ICON[inc.tipo] ?? "⚫"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {inc.tipo.replace("_", " ")}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {inc.descripcion}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {new Date(inc.fechaHora).toLocaleDateString("es-AR")}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inc.estado === "ACTIVO"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {inc.estado}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Últimos requerimientos */}
      {usuario.requerimientos.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">
            Últimos requerimientos
          </h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {usuario.requerimientos.map((req) => (
              <Link
                key={req.id}
                href={`/requerimientos/${req.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">
                  {CATEGORIA_ICON[req.categoria] ?? "📋"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {req.titulo}
                  </p>
                  <p className="text-xs text-gray-400">{req.categoria}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    req.estado === "RESUELTO" || req.estado === "CERRADO"
                      ? "bg-green-100 text-green-700"
                      : req.estado === "EN_PROGRESO"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {req.estado.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
