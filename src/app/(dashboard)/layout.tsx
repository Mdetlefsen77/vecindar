import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { esGestor, GESTORES_PANICO } from "@/lib/permisos";
import { registrarActividad } from "@/lib/actividad";
import { prisma } from "@/lib/prisma/client";
import {
  estadoCobranza,
  mesesVencidos,
  deudaEstimada,
  formatoPesos,
} from "@/lib/cobranza";
import Sidebar from "@/components/ui/Sidebar";
import BottomNav from "@/components/ui/BottomNav";
import MobileHeader from "@/components/ui/MobileHeader";
import InstallPrompt from "@/components/ui/InstallPrompt";
import PushOptInBanner from "@/components/ui/PushOptInBanner";
import CobranzaBanner from "@/components/ui/CobranzaBanner";
import SosAlertListener from "@/components/ui/SosAlertListener";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  registrarActividad(Number(session.user?.id));

  const userName = session.user?.name ?? "Usuario";
  const userEmail = session.user?.email ?? "";
  const userRole = session.user?.role ?? "VECINO";

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { usuarioId: Number(session.user?.id) },
    select: { vigenteHasta: true, montoMensual: true, exento: true },
  });
  const cobranzaVencida = estadoCobranza(suscripcion) === "vencida";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Saltar navegación — visible solo al enfocarlo con el teclado */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {/* Sidebar — tablet/desktop */}
      <Sidebar userName={userName} userEmail={userEmail} userRole={userRole} />

      {/* Header móvil */}
      <MobileHeader
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
      />

      {/* Contenido principal */}
      <div className="md:pl-64">
        {/* Espaciado superior móvil (header fijo h-16) + inferior con safe area (bottom nav 72px + home bar) */}
        <main
          id="contenido"
          className="pt-16 main-mobile-padding md:pt-0 md:pb-0 min-h-screen"
        >
          {cobranzaVencida && (
            <CobranzaBanner
              meses={mesesVencidos(suscripcion?.vigenteHasta)}
              deuda={formatoPesos(deudaEstimada(suscripcion))}
            />
          )}
          {children}
        </main>
      </div>

      {/* Bottom nav — solo mobile */}
      <BottomNav />

      <InstallPrompt />
      <PushOptInBanner />

      {esGestor(userRole, GESTORES_PANICO) && <SosAlertListener />}
    </div>
  );
}
