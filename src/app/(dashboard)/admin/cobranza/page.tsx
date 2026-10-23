import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { esGestor, GESTORES_COBRANZA } from "@/lib/permisos";
import { nombreCompleto } from "@/lib/usuarios";
import {
  estadoCobranza,
  montoDeSuscripcion,
  mesesVencidos,
  deudaEstimada,
  periodoActual,
  periodoLabel,
  formatoPesos,
  type EstadoCobranza,
} from "@/lib/cobranza";
import { invitacionesConPrimerPago } from "@/lib/crecimiento/beneficiosServer";
import {
  descuentosDelPeriodo,
  sumarMeses,
  totalPorUsuario,
} from "@/lib/crecimiento/beneficios";
import Link from "next/link";
import { Suspense } from "react";
import CobranzaFiltros from "./CobranzaFiltros";
import CobranzaTabla, { type FilaCobranza } from "./CobranzaTabla";
import RecordarTodos from "./RecordarTodos";
import type { Prisma } from "@/generated/client";

type SearchParams = Promise<{ estado?: string; q?: string }>;

export default async function AdminCobranzaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!esGestor(session.user.role, GESTORES_COBRANZA)) redirect("/");

  const { estado, q } = await searchParams;

  const ahora = new Date();
  const periodo = periodoActual(ahora);
  const anio = String(ahora.getFullYear());

  const filtroTexto: Prisma.UsuarioWhereInput = q
    ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { apellido: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const proximo = sumarMeses(periodo, 1);
  const [usuarios, cobradoMes, cobradoAnio, invitaciones, pagosConDescuento] =
    await Promise.all([
      prisma.usuario.findMany({
        where: { verificado: true, ...filtroTexto },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          telefono: true,
          rol: true,
          _count: { select: { pushSubscriptions: true } },
          lote: {
            select: {
              numero: true,
              manzana: { select: { numero: true } },
            },
          },
          suscripcion: {
            select: {
              vigenteHasta: true,
              montoMensual: true,
              exento: true,
              notaInterna: true,
            },
          },
          pagos: {
            orderBy: { periodo: "desc" },
            take: 1,
            select: { id: true, periodo: true, monto: true, fecha: true },
          },
        },
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      }),
      prisma.pago.aggregate({
        _sum: { monto: true },
        where: { periodo },
      }),
      prisma.pago.aggregate({
        _sum: { monto: true },
        where: { periodo: { startsWith: `${anio}-` } },
      }),
      invitacionesConPrimerPago(),
      prisma.pago.findMany({
        where: { periodo: { in: [periodo, proximo] } },
        select: { usuarioId: true, periodo: true, monto: true },
      }),
    ]);

  // Descuentos por invitar vecinos, este mes y el próximo, para aplicar a
  // mano al cobrar (de los usuarios que muestra la búsqueda). Si ese mes ya
  // está pago se marca, para no descontarlo dos veces.
  const pagado = new Map(
    pagosConDescuento.map((p) => [`${p.usuarioId}:${p.periodo}`, p.monto]),
  );
  const cuotas = new Map(
    usuarios.map((u) => [
      u.id,
      {
        nombre: nombreCompleto(u),
        cuota: montoDeSuscripcion(u.suscripcion),
        exento: u.suscripcion?.exento ?? false,
      },
    ]),
  );
  const descuentosPorMes = [periodo, proximo].map((p) => ({
    periodo: p,
    filas: [
      ...totalPorUsuario(descuentosDelPeriodo(invitaciones, p, periodo)),
    ].flatMap(([usuarioId, d]) => {
      const u = cuotas.get(usuarioId);
      if (!u || u.exento) return [];
      return [
        {
          usuarioId,
          nombre: u.nombre,
          motivos: d.motivos,
          descuento: Math.min(d.monto, u.cuota),
          cobrar: Math.max(0, u.cuota - d.monto),
          cuota: u.cuota,
          pagado: pagado.get(`${usuarioId}:${p}`) ?? null,
        },
      ];
    }),
  }));

  const filas: FilaCobranza[] = usuarios.map((u) => ({
    id: u.id,
    nombre: nombreCompleto(u),
    nombrePila: u.nombre,
    telefono: u.telefono,
    conPush: u._count.pushSubscriptions > 0,
    mesesVencidos: u.suscripcion?.exento
      ? 0
      : mesesVencidos(u.suscripcion?.vigenteHasta, ahora),
    deuda: deudaEstimada(u.suscripcion, ahora),
    lote: `MZ ${u.lote.manzana.numero} – ${u.lote.numero}`,
    estado: estadoCobranza(u.suscripcion, ahora),
    vigenteHasta: u.suscripcion?.vigenteHasta
      ? u.suscripcion.vigenteHasta.toISOString()
      : null,
    montoMensual: montoDeSuscripcion(u.suscripcion),
    montoPropio: u.suscripcion?.montoMensual ?? null,
    exento: u.suscripcion?.exento ?? false,
    notaInterna: u.suscripcion?.notaInterna ?? null,
    ultimoPago: u.pagos[0]
      ? {
          id: u.pagos[0].id,
          periodo: u.pagos[0].periodo,
          monto: u.pagos[0].monto,
        }
      : null,
  }));

  const conteos: Record<EstadoCobranza, number> = {
    al_dia: 0,
    vencida: 0,
    sin_datos: 0,
    exento: 0,
  };
  for (const f of filas) conteos[f.estado] += 1;

  const deudores = filas.filter(
    (f) => f.estado === "vencida" || f.estado === "sin_datos",
  );
  const deudoresConPush = deudores.filter((f) => f.conPush).length;

  const filasFiltradas = esEstadoValido(estado)
    ? filas.filter((f) => f.estado === estado)
    : filas;

  const resumen = [
    { label: "Al día", value: conteos.al_dia, estado: "al_dia" as const },
    { label: "Vencidos", value: conteos.vencida, estado: "vencida" as const },
    {
      label: "Sin datos",
      value: conteos.sin_datos,
      estado: "sin_datos" as const,
    },
    { label: "Exentos", value: conteos.exento, estado: "exento" as const },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link
          href={session.user.role === "ADMIN" ? "/admin" : "/inicio"}
          className="text-gray-500 hover:text-gray-600 text-sm"
        >
          ← {session.user.role === "ADMIN" ? "Admin" : "Inicio"}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Cobranza</h1>
        <p className="text-sm text-gray-500">
          {filas.length} usuarios · cobrado en {periodo}:{" "}
          <span className="font-medium text-gray-700">
            {formatoPesos(cobradoMes._sum.monto ?? 0)}
          </span>{" "}
          · en {anio}:{" "}
          <span className="font-medium text-gray-700">
            {formatoPesos(cobradoAnio._sum.monto ?? 0)}
          </span>
        </p>
      </div>

      {/* Resumen por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {resumen.map((r) => (
          <Link
            key={r.estado}
            href={`/admin/cobranza?estado=${r.estado}`}
            className={`border-2 rounded-xl p-3 hover:shadow-md transition-shadow ${
              estado === r.estado
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {r.value}
            </p>
            <p className="text-xs text-gray-600 font-medium mt-1">{r.label}</p>
          </Link>
        ))}
      </div>

      {/* Recordatorios a deudores */}
      {deudores.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              {deudores.length} vecinos con la cuota vencida o sin pagos
            </p>
            <p className="text-amber-800">
              {deudoresConPush} reciben notificaciones push ·{" "}
              {deudores.length - deudoresConPush} sin push activo (escribiles
              por WhatsApp desde la tabla)
            </p>
          </div>
          <RecordarTodos conPush={deudoresConPush} />
        </div>
      )}

      {/* Descuentos por invitar vecinos: los aplica tesorería al cobrar */}
      {descuentosPorMes.some((m) => m.filas.length > 0) && (
        <section className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4 space-y-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              🎁 Descuentos por invitar vecinos
            </h2>
            <p className="text-sm text-gray-700">
              Aplicalos al cobrar: el monto de la tabla de abajo no los incluye.
            </p>
          </div>
          {descuentosPorMes.map(
            (m) =>
              m.filas.length > 0 && (
                <div key={m.periodo}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    {periodoLabel(m.periodo)}
                  </h3>
                  <ul className="divide-y divide-yellow-200 rounded-lg bg-white border border-yellow-200">
                    {m.filas.map((f) => (
                      <li
                        key={f.usuarioId}
                        className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {f.nombre}
                          </p>
                          {f.motivos.map((motivo) => (
                            <p key={motivo} className="text-gray-600">
                              {motivo}
                            </p>
                          ))}
                        </div>
                        {f.pagado !== null ? (
                          <p className="text-right whitespace-nowrap text-gray-600">
                            ✓ Ya pagó {formatoPesos(f.pagado)}
                          </p>
                        ) : (
                          <p className="text-right whitespace-nowrap">
                            <span className="text-green-700 font-semibold">
                              −{formatoPesos(f.descuento)}
                            </span>
                            <br />
                            <span className="text-gray-900 font-bold">
                              Cobrar {formatoPesos(f.cobrar)}
                            </span>{" "}
                            <span className="text-gray-400 line-through">
                              {formatoPesos(f.cuota)}
                            </span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Suspense>
          <CobranzaFiltros />
        </Suspense>
        <a
          href={`/api/cobranza/export?anio=${anio}`}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
        >
          Exportar CSV {anio}
        </a>
      </div>

      <CobranzaTabla filas={filasFiltradas} periodoActual={periodo} />
    </div>
  );
}

function esEstadoValido(v: string | undefined): v is EstadoCobranza {
  return (
    v === "al_dia" || v === "vencida" || v === "sin_datos" || v === "exento"
  );
}
