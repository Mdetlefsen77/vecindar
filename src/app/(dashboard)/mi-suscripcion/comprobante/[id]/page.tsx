import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { getUserId, parseId } from "@/lib/api/guard";
import { esGestor, GESTORES_COBRANZA } from "@/lib/permisos";
import { METODO_PAGO_LABEL, formatoPesos, periodoLabel } from "@/lib/cobranza";
import ExportarPdfBoton from "@/components/reportes/ExportarPdfBoton";

// Comprobante de pago de la cuota: página imprimible (print CSS, igual que
// /reportes) que el vecino guarda como PDF. Lo ve el dueño del pago o quien
// gestiona cobranza (ADMIN / TESORERO), así el tesorero se lo puede mandar.

function numeroComprobante(id: number): string {
  return String(id).padStart(6, "0");
}

function fmtFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pagoId = parseId(id);
  // El <title> es el nombre de archivo sugerido al "Guardar como PDF".
  return {
    title: pagoId
      ? `Comprobante ${numeroComprobante(pagoId)} - Vecindar`
      : "Comprobante",
  };
}

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const pagoId = parseId(id);
  if (!pagoId) notFound();

  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    select: {
      id: true,
      usuarioId: true,
      periodo: true,
      monto: true,
      metodo: true,
      fecha: true,
      mpPaymentId: true,
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          email: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
    },
  });

  // 404 también si no es suyo: no revelar que el pago existe.
  const esDueno = pago?.usuarioId === getUserId(session);
  const esGestorCobranza = esGestor(session.user.role, GESTORES_COBRANZA);
  if (!pago || (!esDueno && !esGestorCobranza)) notFound();

  const { usuario } = pago;
  const lote = `Manzana ${usuario.lote.manzana.numero} · Lote ${usuario.lote.numero}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <Link
          href={esDueno ? "/mi-suscripcion" : "/admin/cobranza"}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          ← Volver
        </Link>
        <ExportarPdfBoton label="Descargar PDF" />
      </div>

      <article className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 print:border-gray-300 print:shadow-none print:rounded-none">
        {/* Membrete */}
        <header className="flex items-center justify-between gap-4 border-b-2 border-gray-900 pb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/image.png"
              alt="Escudo Control y Vigilancia Universitario de Horizonte 3 Sur"
              width={383}
              height={344}
              priority
              className="h-20 w-auto"
            />
            <div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                Vecindar
              </p>
              <p className="text-xs text-gray-600">
                Universitario de Horizonte 3 Sur
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Comprobante de pago
            </p>
            <p className="text-lg font-bold font-mono text-gray-900">
              N° {numeroComprobante(pago.id)}
            </p>
          </div>
        </header>

        {/* Datos del pagador */}
        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recibimos de
          </p>
          <p className="text-xl font-semibold text-gray-900 mt-0.5">
            {usuario.nombre} {usuario.apellido}
          </p>
          <p className="text-sm text-gray-600">{lote}</p>
          <p className="text-sm text-gray-600">{usuario.email}</p>
        </section>

        {/* Detalle */}
        <section className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 print:bg-gray-100">
              <tr>
                <th className="text-left font-semibold px-4 py-2">Concepto</th>
                <th className="text-right font-semibold px-4 py-2">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-900">
                  Cuota mensual de seguridad y app —{" "}
                  <span className="capitalize">
                    {periodoLabel(pago.periodo)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                  {formatoPesos(pago.monto)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base whitespace-nowrap">
                  {formatoPesos(pago.monto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Fecha de pago</dt>
            <dd className="font-medium text-gray-900">{fmtFecha(pago.fecha)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Medio de pago</dt>
            <dd className="font-medium text-gray-900">
              {METODO_PAGO_LABEL[pago.metodo] ?? pago.metodo}
            </dd>
          </div>
          {pago.mpPaymentId && (
            <div className="col-span-2">
              <dt className="text-gray-500">Operación MercadoPago</dt>
              <dd className="font-medium font-mono text-gray-900">
                {pago.mpPaymentId}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium print:bg-white">
          ✓ Pago registrado. ¡Gracias por acompañar la seguridad del barrio!
        </div>

        <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
          <p>Emitido el {fmtFecha(new Date())} desde Vecindar.</p>
          <p>
            Comprobante interno de pago de la cuota vecinal. No válido como
            factura.
          </p>
        </footer>
      </article>
    </div>
  );
}
