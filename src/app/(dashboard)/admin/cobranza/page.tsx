import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import {
  estadoCobranza,
  montoDeSuscripcion,
  periodoActual,
  formatoPesos,
  type EstadoCobranza,
} from "@/lib/cobranza";
import Link from "next/link";
import { Suspense } from "react";
import CobranzaFiltros from "./CobranzaFiltros";
import CobranzaTabla, { type FilaCobranza } from "./CobranzaTabla";
import type { Prisma } from "@/generated/client";

type SearchParams = Promise<{ estado?: string; q?: string }>;

export default async function AdminCobranzaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

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

  const [usuarios, cobradoMes, cobradoAnio] = await Promise.all([
    prisma.usuario.findMany({
      where: { verificado: true, ...filtroTexto },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
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
  ]);

  const filas: FilaCobranza[] = usuarios.map((u) => ({
    id: u.id,
    nombre: nombreCompleto(u),
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
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Admin
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
