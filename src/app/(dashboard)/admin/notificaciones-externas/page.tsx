import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { nombreCompleto } from "@/lib/usuarios";
import { HORAS_PRUEBA } from "@/lib/prueba";

const TIPO_LABEL: Record<string, string> = {
  INCIDENTE: "Incidentes",
  REQUERIMIENTO: "Requerimientos",
  MASCOTA: "Mascotas",
  ALERTA_PANICO: "Alertas de pánico",
  RESUMEN: "Resúmenes",
};

// HU-11 — métricas del puente (Fase 0/1: sin outbox, todo lo compartido es
// modo MANUAL). CTR por tipo de evento, clicks sin sesión, conversión a
// registro, y evolución de activos 7d/30d para comparar contra la línea de
// base que se mide a mano (tarea 6.2, no hay forma de automatizar "qué se
// comentaba solo en WhatsApp antes del puente").
export default async function NotificacionesExternasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now();
  const hace7d = new Date(ahora - 7 * 86_400_000);
  const hace30d = new Date(ahora - 30 * 86_400_000);

  const [
    publicacionesPorTipo,
    linksConPublicacion,
    clicksSinSesion,
    clicksTotales,
    altasWhatsapp,
    totalUsuarios,
    activos7d,
    activos30d,
  ] = await Promise.all([
    prisma.publicacionExterna.groupBy({
      by: ["tipoEvento"],
      _count: { _all: true },
    }),
    prisma.linkRastreable.findMany({
      where: { publicacionId: { not: null } },
      select: { clicks: true, publicacion: { select: { tipoEvento: true } } },
    }),
    prisma.clickLink.count({ where: { tenerSesion: false } }),
    prisma.clickLink.count(),
    prisma.usuario.count({ where: { origenRegistro: "WHATSAPP" } }),
    prisma.usuario.count(),
    prisma.usuario.count({ where: { ultimaActividadAt: { gte: hace7d } } }),
    prisma.usuario.count({ where: { ultimaActividadAt: { gte: hace30d } } }),
  ]);

  // Embudo de altas por canal: clicks → cuentas → aprobadas → con pago.
  // "Aprobada" = verificado (con prueba o definitiva); "con pago" = al menos
  // un pago registrado. No hay forma de saber cuántos *recibieron* el link,
  // solo cuántos lo abrieron.
  const porInvitacion = { invitadoPorId: { not: null } };
  const porWhatsapp = { origenRegistro: "WHATSAPP" as const };
  const conPrueba = { pruebaIniciadaAt: { not: null } };
  const conPago = { pagos: { some: {} } };
  const ahoraFecha = new Date(ahora);
  const [
    clicksInvitacion,
    altasInvitacion,
    aprobadasInvitacion,
    pagoInvitacion,
    aprobadasWhatsapp,
    pagoWhatsapp,
    pruebasTotales,
    pruebasConPago,
    pruebasEnCurso,
    pruebasVencidas,
    topInvitadores,
  ] = await Promise.all([
    prisma.codigoInvitacion.aggregate({ _sum: { clicks: true } }),
    prisma.usuario.count({ where: porInvitacion }),
    prisma.usuario.count({ where: { ...porInvitacion, verificado: true } }),
    prisma.usuario.count({ where: { ...porInvitacion, ...conPago } }),
    prisma.usuario.count({ where: { ...porWhatsapp, verificado: true } }),
    prisma.usuario.count({ where: { ...porWhatsapp, ...conPago } }),
    prisma.usuario.count({ where: conPrueba }),
    prisma.usuario.count({ where: { ...conPrueba, ...conPago } }),
    prisma.usuario.count({ where: { pruebaHasta: { gt: ahoraFecha } } }),
    prisma.usuario.count({ where: { pruebaHasta: { lte: ahoraFecha } } }),
    prisma.codigoInvitacion.findMany({
      where: { clicks: { gt: 0 } },
      orderBy: [{ registros: "desc" }, { clicks: "desc" }],
      take: 10,
      select: {
        clicks: true,
        registros: true,
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    }),
  ]);

  const embudo = [
    {
      canal: "🤝 Invitación entre vecinos",
      clicks: clicksInvitacion._sum.clicks ?? 0,
      cuentas: altasInvitacion,
      aprobadas: aprobadasInvitacion,
      conPago: pagoInvitacion,
    },
    {
      canal: "💬 Links en el grupo de WhatsApp",
      clicks: clicksSinSesion,
      cuentas: altasWhatsapp,
      aprobadas: aprobadasWhatsapp,
      conPago: pagoWhatsapp,
    },
  ];

  const clicksPorTipo = new Map<string, number>();
  for (const link of linksConPublicacion) {
    const tipo = link.publicacion?.tipoEvento;
    if (!tipo) continue;
    clicksPorTipo.set(tipo, (clicksPorTipo.get(tipo) ?? 0) + link.clicks);
  }

  const filas = publicacionesPorTipo.map((p) => {
    const publicados = p._count._all;
    const clicks = clicksPorTipo.get(p.tipoEvento) ?? 0;
    const ctr = publicados > 0 ? (clicks / publicados) * 100 : 0;
    return {
      tipo: TIPO_LABEL[p.tipoEvento] ?? p.tipoEvento,
      publicados,
      clicks,
      ctr,
    };
  });

  const conversion =
    clicksSinSesion > 0 ? (altasWhatsapp / clicksSinSesion) * 100 : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Links compartidos y altas — métricas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Fase 1 (compartido manual). Umbrales de éxito en{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
            docs/proposal-whatsapp-bridge.md
          </code>{" "}
          (D7).
        </p>
      </div>

      {/* Embudo de altas por canal */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">
          De link a cuenta paga
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Clicks sin sesión → cuentas creadas → aprobadas → con al menos un
          pago. Cada usuario muestra su origen en su ficha.
        </p>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
          {embudo.map((e) => (
            <div key={e.canal} className="p-3">
              <p className="text-sm font-medium text-gray-900">{e.canal}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Clicks", valor: e.clicks },
                  { label: "Cuentas", valor: e.cuentas },
                  { label: "Aprobadas", valor: e.aprobadas },
                  { label: "Con pago", valor: e.conPago },
                ].map((paso) => (
                  <div key={paso.label}>
                    <p className="text-xl font-bold text-gray-900">
                      {paso.valor}
                    </p>
                    <p className="text-xs text-gray-500">{paso.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {e.clicks > 0
                  ? `${((e.cuentas / e.clicks) * 100).toFixed(0)}% de los clicks creó cuenta`
                  : "Sin clicks todavía"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Período de prueba */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">
          Aprobados con prueba de {HORAS_PRUEBA} hs
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tuvieron prueba", valor: pruebasTotales },
            { label: "En prueba ahora", valor: pruebasEnCurso },
            { label: "Vencidos sin pagar", valor: pruebasVencidas },
            { label: "Pagaron", valor: pruebasConPago },
          ].map((m) => (
            <div
              key={m.label}
              className="border-2 border-gray-200 bg-white rounded-xl p-4"
            >
              <p className="text-3xl font-bold text-gray-900 leading-none">
                {m.valor}
              </p>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quién invita */}
      {topInvitadores.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">
            Vecinos que más invitan
          </h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
            {topInvitadores.map((t) => (
              <Link
                key={t.usuario.id}
                href={`/admin/usuarios/${t.usuario.id}`}
                className="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-900">
                  {nombreCompleto(t.usuario)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.clicks} clicks · {t.registros} cuenta
                  {t.registros === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTR por tipo de evento */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">
          CTR por tipo de evento
        </h2>
        {filas.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            Todavía no se compartió nada.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
            {filas.map((f) => (
              <div
                key={f.tipo}
                className="flex items-center justify-between p-3"
              >
                <p className="text-sm font-medium text-gray-900">{f.tipo}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {f.ctr.toFixed(0)}% CTR
                  </p>
                  <p className="text-xs text-gray-400">
                    {f.clicks} clicks / {f.publicados} publicados
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversión */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="border-2 border-gray-200 bg-white rounded-xl p-4">
          <p className="text-2xl">👆</p>
          <p className="text-3xl font-bold text-gray-900 leading-none mt-1">
            {clicksSinSesion}
            <span className="text-base font-normal text-gray-400">
              {" "}
              / {clicksTotales}
            </span>
          </p>
          <p className="text-xs text-gray-600 font-medium">
            Clicks sin sesión
          </p>
        </div>
        <div className="border-2 border-gray-200 bg-white rounded-xl p-4">
          <p className="text-2xl">🆕</p>
          <p className="text-3xl font-bold text-gray-900 leading-none mt-1">
            {altasWhatsapp}
          </p>
          <p className="text-xs text-gray-600 font-medium">
            Altas atribuidas a WhatsApp
          </p>
        </div>
        <div className="border-2 border-gray-200 bg-white rounded-xl p-4">
          <p className="text-2xl">📊</p>
          <p className="text-3xl font-bold text-gray-900 leading-none mt-1">
            {conversion === null ? "—" : `${conversion.toFixed(0)}%`}
          </p>
          <p className="text-xs text-gray-600 font-medium">
            Conversión click → registro
          </p>
        </div>
      </div>

      {/* Usuarios activos */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">
          Usuarios activos (para comparar contra la línea de base)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-gray-200 bg-white rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900 leading-none">
              {activos7d}
              <span className="text-base font-normal text-gray-400">
                {" "}
                / {totalUsuarios}
              </span>
            </p>
            <p className="text-xs text-gray-600 font-medium mt-1">
              Activos últimos 7 días
            </p>
          </div>
          <div className="border-2 border-gray-200 bg-white rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900 leading-none">
              {activos30d}
              <span className="text-base font-normal text-gray-400">
                {" "}
                / {totalUsuarios}
              </span>
            </p>
            <p className="text-xs text-gray-600 font-medium mt-1">
              Activos últimos 30 días
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
