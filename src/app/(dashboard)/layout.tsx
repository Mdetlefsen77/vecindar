import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { esGestor, GESTORES_PANICO } from "@/lib/permisos";
import { registrarActividad } from "@/lib/actividad";
import Sidebar from "@/components/ui/Sidebar";
import BottomNav from "@/components/ui/BottomNav";
import MobileHeader from "@/components/ui/MobileHeader";
import InstallPrompt from "@/components/ui/InstallPrompt";
import PushOptInBanner from "@/components/ui/PushOptInBanner";
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

  return (
    <div className="min-h-screen bg-gray-50">
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
        <main className="pt-16 main-mobile-padding md:pt-0 md:pb-0 min-h-screen">
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
