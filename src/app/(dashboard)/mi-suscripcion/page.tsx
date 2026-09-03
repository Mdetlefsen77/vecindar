import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import { tiempoRelativo } from "@/lib/fechas";
import {
  DATOS_PAGO,
  METODO_PAGO_LABEL,
  estadoCobranza,
  montoDeSuscripcion,
  mesesVencidos,
  deudaEstimada,
  formatoPesos,
  periodoLabel,
  type EstadoCobranza,
} from "@/lib/cobranza";

export const metadata = { title: "Mi suscripción" };

const ESTADO_UI: Record<
  EstadoCobranza,
  { titulo: string; clase: string; detalle: string }
> = {
  al_dia: {
    titulo: "Al día",
    clase: "border-green-300 bg-green-50 text-green-800",
    detalle: "Tenés la cuota mensual al día. ¡Gracias!",
  },
  vencida: {
    titulo: "Vencida",
    clase: "border-amber-300 bg-amber-50 text-amber-900",
    detalle: "Tu cuota está vencida. Abajo están los datos para regularizarla.",
  },
  sin_datos: {
    titulo: "Sin registro",
    clase: "border-gray-200 bg-gray-50 text-gray-700",
    detalle:
      "Todavía no hay pagos registrados a tu nombre. Si ya pagaste, avisá al administrador.",
  },
  exento: {
    titulo: "Exento",
    clase: "border-blue-200 bg-blue-50 text-blue-800",
    detalle: "Estás exento del pago de la cuota mensual.",
  },
};

function fmtFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function MiSuscripcionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: getUserId(session) },
    select: {
      suscripcion: {
        select: { vigenteHasta: true, montoMensual: true, exento: true },
      },
      pagos: {
        orderBy: { periodo: "desc" },
        select: { id: true, periodo: true, monto: true, metodo: true, fecha: true },
      },
    },
  });

  const suscripcion = usuario?.suscripcion ?? null;
  const pagos = usuario?.pagos ?? [];

  const ahora = new Date();
  const estado = estadoCobranza(suscripcion, ahora);
  const ui = ESTADO_UI[estado];
  const cuota = montoDeSuscripcion(suscripcion);
  const meses = mesesVencidos(suscripcion?.vigenteHasta, ahora);
  const deuda = deudaEstimada(suscripcion, ahora);

  const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0);
  const mostrarComoPagar = estado === "vencida" || estado === "sin_datos";
  const datosPago = [
    DATOS_PAGO.alias && { label: "Alias", valor: DATOS_PAGO.alias },
    DATOS_PAGO.cbu && { label: "CBU/CVU", valor: DATOS_PAGO.cbu },
    DATOS_PAGO.titular && { label: "Titular", valor: DATOS_PAGO.titular },
  ].filter(Boolean) as { label: string; valor: string }[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi suscripción</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cuota mensual del barrio: {formatoPesos(cuota)}
        </p>
      </div>

      {/* Estado actual */}
      <div className={`rounded-2xl border-2 p-4 ${ui.clase}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Estado
        </p>
        <p className="text-2xl font-bold mt-0.5">{ui.titulo}</p>
        <p className="text-sm mt-1">{ui.detalle}</p>

        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="opacity-70">Cobertura hasta</dt>
            <dd className="font-semibold">
              {suscripcion?.vigenteHasta
                ? fmtFecha(suscripcion.vigenteHasta)
                : "—"}
            </dd>
          </div>
          {estado === "vencida" && (
            <div>
              <dt className="opacity-70">Adeudás</dt>
              <dd className="font-semibold">
                {meses === 1 ? "1 mes" : `${meses} meses`} ·{" "}
                {formatoPesos(deuda)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Cómo pagar */}
      {mostrarComoPagar && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="font-bold text-gray-900">Cómo pagar</h2>
          {datosPago.length > 0 ? (
            <dl className="mt-2 divide-y divide-gray-100">
              {datosPago.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <dt className="text-sm text-gray-500">{d.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900 text-right break-all">
                    {d.valor}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Los datos de pago todavía no están cargados. Consultá con el
              administrador del barrio.
            </p>
          )}
          {DATOS_PAGO.nota && (
            <p className="mt-3 text-sm text-gray-600">{DATOS_PAGO.nota}</p>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Historial de pagos</h2>
          <span className="text-sm text-gray-500">
            {pagos.length === 0
              ? "Sin pagos"
              : `${pagos.length} ${pagos.length === 1 ? "pago" : "pagos"} · ${formatoPesos(totalPagado)}`}
          </span>
        </div>

        {pagos.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            Todavía no hay pagos registrados a tu nombre.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {pagos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm capitalize">
                    {periodoLabel(p.periodo)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {METODO_PAGO_LABEL[p.metodo] ?? p.metodo} ·{" "}
                    {fmtFecha(p.fecha)} ({tiempoRelativo(p.fecha)})
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatoPesos(p.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Los pagos los registra el administrador del barrio. Si ves algo que no
        coincide, escribile.
      </p>
    </div>
  );
}
