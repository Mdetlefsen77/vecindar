import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { getUserId } from "@/lib/api/guard";
import SalirBoton from "@/app/prueba-finalizada/SalirBoton";

export const metadata: Metadata = { title: "Cuenta no aprobada · Vecindar" };

// Pantalla para la cuenta desaprobada con sesión vigente. Vive fuera del
// layout del dashboard a propósito: ese layout es el que redirige acá.
export default async function CuentaNoAprobadaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: getUserId(session) },
    select: { verificado: true },
  });
  if (usuario?.verificado !== false) redirect("/inicio");

  return (
    <div className="min-h-dvh flex items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-3">
          <h1 className="text-xl font-bold text-gray-900">
            Tu cuenta no está aprobada
          </h1>
          <p className="text-sm text-gray-600">
            Hablá con un administrador del barrio para que la vuelva a aprobar.
          </p>
        </div>

        <SalirBoton />
      </div>
    </div>
  );
}
