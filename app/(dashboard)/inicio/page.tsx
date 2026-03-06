import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import type {
  TipoIncidente,
  CategoriaReq,
  EstadoRequerimiento,
  TipoAlertaMascota,
} from "@prisma/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

// ─── Config por tipo ─────────────────────────────────────────────────────────

const INCIDENTE_CFG: Record<
  TipoIncidente,
  { label: string; bg: string; dot: string }
> = {
  ROBO: { label: "Robo", bg: "bg-red-100 text-red-700", dot: "bg-red-500" },
  ROBO_TENTATIVA: {
    label: "Tentativa",
    bg: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  SOSPECHOSO: {
    label: "Sospechoso",
    bg: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  VANDALISMO: {
    label: "Vandalismo",
    bg: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  OTRO: { label: "Otro", bg: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

const CATEGORIA_CFG: Record<CategoriaReq, { label: string; color: string }> = {
  ILUMINACION: { label: "Iluminación", color: "bg-yellow-100 text-yellow-800" },
  PODA: { label: "Poda", color: "bg-green-100 text-green-800" },
  CALLES: { label: "Calles", color: "bg-stone-100 text-stone-700" },
  LIMPIEZA: { label: "Limpieza", color: "bg-sky-100 text-sky-700" },
  SEGURIDAD: { label: "Seguridad", color: "bg-red-100 text-red-700" },
  INFRAESTRUCTURA: {
    label: "Infraest.",
    color: "bg-orange-100 text-orange-700",
  },
  OTRO: { label: "Otro", color: "bg-gray-100 text-gray-600" },
};

const ESTADO_REQ_CFG: Record<
  EstadoRequerimiento,
  { label: string; color: string }
> = {
  NUEVO: { label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  EN_PROGRESO: { label: "En progreso", color: "bg-amber-100 text-amber-700" },
  RESUELTO: { label: "Resuelto", color: "bg-green-100 text-green-700" },
  CERRADO: { label: "Cerrado", color: "bg-gray-100 text-gray-600" },
};

// ─── Íconos SVG ──────────────────────────────────────────────────────────────

// Icon sizes: sm on mobile, lg on tablet+
const IconMap = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);
const IconClipboard = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);
const IconPaw = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5C8 2.67 8.67 2 9.5 2S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5zm8 5c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5zm-11 0C5.67 15 5 14.33 5 13.5v-3C5 9.67 5.67 9 6.5 9S8 9.67 8 10.5v3c0 .83-.67 1.5-1.5 1.5zm5.5 5c-2.5 0-6-2.5-6-6 0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5 0 3.5-3.5 6-6 6z"
    />
  </svg>
);
const IconPin = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
const IconShield = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function InicioPage() {
  const session = await auth();
  const isVecino = session?.user?.role === "VECINO";
  const nombre = session?.user?.name?.split(" ")[0] ?? "Vecino";

  const [incidentes, requerimientos, mascotas] = await Promise.all([
    prisma.incidente.findMany({
      where: {
        estado: "ACTIVO",
        ...(isVecino ? { visibleVecinos: true } : {}),
      },
      include: {
        lote: {
          select: {
            numero: true,
            calleFrente: true,
            manzana: { select: { numero: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.requerimiento.findMany({
      where: { estado: { in: ["NUEVO", "EN_PROGRESO"] } },
      include: {
        usuario: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.mascotaPerdida.findMany({
      where: { estado: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 space-y-3 sm:space-y-4 max-w-7xl mx-auto">
      {/* Saludo — visible en tablet+, compacto en mobile */}
      <div className="hidden sm:block">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          ¡Hola, {nombre}!
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* SOS Button — más compacto en mobile */}
      <Link href="/panico" className="block">
        <div className="bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all rounded-2xl py-4 sm:py-5 text-center text-white shadow-lg select-none">
          <p className="text-3xl sm:text-4xl font-black tracking-[0.2em]">
            SOS
          </p>
          <p className="text-xs sm:text-sm font-medium opacity-85 mt-1">
            Mantener presionado 3s
          </p>
        </div>
      </Link>

      {/* Accesos rápidos — ícono+texto vertical en mobile, horizontal en sm+ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[
          {
            href: "/mapa",
            icon: <IconMap />,
            label: "Mapa",
            cls: "bg-blue-600 hover:bg-blue-700",
          },
          {
            href: "/requerimientos",
            icon: <IconClipboard />,
            label: "Requerimientos",
            cls: "bg-amber-500 hover:bg-amber-600",
          },
          {
            href: "/mascotas",
            icon: <IconPaw />,
            label: "Mascotas",
            cls: "bg-teal-600 hover:bg-teal-700",
          },
          {
            href: "/panico",
            icon: <IconPin />,
            label: "Estoy aquí",
            cls: "bg-rose-500 hover:bg-rose-600",
          },
        ].map(({ href, icon, label, cls }) => (
          <Link
            key={href}
            href={href}
            className={`${cls} active:scale-[0.97] transition-all rounded-2xl text-white shadow-sm
              flex flex-col items-center justify-center gap-1.5 py-4 px-2
              sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:py-4`}
          >
            {icon}
            <span className="text-xs font-semibold sm:text-base sm:font-semibold leading-tight text-center sm:text-left">
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* Secciones principales — columna única mobile, 2 col en lg */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Últimos incidentes */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">
                <IconShield />
              </span>
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                Últimos incidentes
              </h2>
            </div>
            <Link
              href="/incidentes"
              className="text-xs sm:text-sm text-blue-600 font-medium hover:underline whitespace-nowrap"
            >
              Ver más ›
            </Link>
          </div>

          {incidentes.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              Sin incidentes activos
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {incidentes.map((inc) => {
                const cfg = INCIDENTE_CFG[inc.tipo as TipoIncidente];
                const ubicacion =
                  inc.ubicacionText ??
                  (inc.lote
                    ? `Manzana ${inc.lote.manzana.numero}, Lote ${inc.lote.numero}`
                    : "Sin ubicación");
                return (
                  <li key={inc.id}>
                    <Link
                      href={`/incidentes/${inc.id}`}
                      className="flex items-start gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      {/* Dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        <span
                          className={`block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${cfg.dot}`}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug">
                            {cfg.label} reportado
                          </p>
                          <span
                            className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {ubicacion}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {timeAgo(inc.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Requerimientos abiertos */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </span>
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                Requerimientos abiertos
              </h2>
            </div>
            <Link
              href="/requerimientos"
              className="text-xs sm:text-sm text-blue-600 font-medium hover:underline whitespace-nowrap"
            >
              Ver más ›
            </Link>
          </div>

          {requerimientos.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              Sin requerimientos abiertos
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {requerimientos.map((req) => {
                const catCfg = CATEGORIA_CFG[req.categoria as CategoriaReq];
                const estadoCfg =
                  ESTADO_REQ_CFG[req.estado as EstadoRequerimiento];
                return (
                  <li key={req.id}>
                    <Link
                      href={`/requerimientos/${req.id}`}
                      className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      {/* Categoría badge — izquierda */}
                      <span
                        className={`flex-shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md ${catCfg.color}`}
                      >
                        {catCfg.label}
                      </span>
                      {/* Contenido central */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate leading-snug">
                          {req.titulo}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {req.usuario.nombre} · {timeAgo(req.createdAt)}
                        </p>
                      </div>
                      {/* Estado badge — derecha */}
                      <span
                        className={`flex-shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${estadoCfg.color}`}
                      >
                        {estadoCfg.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Mascotas perdidas */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-teal-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5C8 2.67 8.67 2 9.5 2S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5zm8 5c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5zm-11 0C5.67 15 5 14.33 5 13.5v-3C5 9.67 5.67 9 6.5 9S8 9.67 8 10.5v3c0 .83-.67 1.5-1.5 1.5zm5.5 5c-2.5 0-6-2.5-6-6 0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5 0 3.5-3.5 6-6 6z"
                  />
                </svg>
              </span>
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                Mascotas perdidas
              </h2>
            </div>
            <Link
              href="/mascotas"
              className="text-xs sm:text-sm text-blue-600 font-medium hover:underline whitespace-nowrap"
            >
              Ver más ›
            </Link>
          </div>

          {mascotas.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              Sin alertas de mascotas activas
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:divide-x">
              {mascotas.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/mascotas/${m.id}`}
                    className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {/* Avatar */}
                    {m.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.foto}
                        alt={m.nombre ?? "mascota"}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-xl sm:text-2xl border-2 border-amber-200">
                        🐾
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                          {m.nombre ?? "Sin nombre"}
                        </p>
                        <span
                          className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            (m.tipo as TipoAlertaMascota) === "PERDIDA"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {(m.tipo as TipoAlertaMascota) === "PERDIDA"
                            ? "Perdida"
                            : "Encontrada"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {m.descripcion}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {timeAgo(m.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
