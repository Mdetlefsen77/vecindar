import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import { estadoPrueba, HORAS_PRUEBA } from "@/lib/prueba";
import {
  DATOS_PAGO,
  formatoPesos,
  montoDeSuscripcion,
} from "@/lib/cobranza";
import SalirBoton from "./SalirBoton";

export const metadata: Metadata = { title: "Tu prueba terminó · Vecindar" };

// Pantalla de bloqueo para la cuenta cuya prueba venció (src/lib/prueba.ts).
// Vive fuera del layout del dashboard a propósito: ese layout es el que
// redirige acá. Si la cuenta ya no está vencida (pagó o un admin la aprobó
// definitiva), vuelve directo a la app.
export default async function PruebaFinalizadaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: getUserId(session) },
    select: {
      pruebaHasta: true,
      suscripcion: { select: { montoMensual: true } },
    },
  });
  if (estadoPrueba(usuario?.pruebaHasta) !== "vencida") redirect("/inicio");

  const cuota = montoDeSuscripcion(usuario?.suscripcion);
  const datosPago = [
    DATOS_PAGO.alias && { label: "Alias", valor: DATOS_PAGO.alias },
    DATOS_PAGO.cbu && { label: "CBU/CVU", valor: DATOS_PAGO.cbu },
    DATOS_PAGO.titular && { label: "Titular", valor: DATOS_PAGO.titular },
  ].filter(Boolean) as { label: string; valor: string }[];

  return (
    <div className="min-h-dvh flex items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-3">
          <p className="text-4xl" aria-hidden>
            ⌛
          </p>
          <h1 className="text-xl font-bold text-gray-900">
            Ya pasaron tus {HORAS_PRUEBA} hs de prueba
          </h1>
          <p className="text-sm text-gray-600">
            Vecindar funciona con una suscripción mensual de{" "}
            <span className="font-semibold">{formatoPesos(cuota)}</span>. Para
            seguir usando la app, pagá tu primera cuota: apenas se registre el
            pago, tu cuenta vuelve a estar activa.
          </p>
        </div>

        {datosPago.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900">Cómo pagar</h2>
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
            {DATOS_PAGO.nota && (
              <p className="mt-2 text-sm text-gray-600">{DATOS_PAGO.nota}</p>
            )}
          </div>
        )}

        <SalirBoton />
      </div>
    </div>
  );
}
