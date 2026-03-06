import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import BottomNav from "@/components/ui/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userName = session.user?.name ?? "Usuario";
  const userEmail = session.user?.email ?? "";
  const userRole = session.user?.role ?? "VECINO";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — tablet/desktop */}
      <Sidebar userName={userName} userEmail={userEmail} userRole={userRole} />

      {/* Header móvil */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
        <span className="text-xl font-bold text-brand">Vecindar</span>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-700 font-semibold text-base">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="md:pl-64">
        {/* Espaciado superior móvil (header fijo h-16) + inferior con safe area (bottom nav 72px + home bar) */}
        <main className="pt-16 main-mobile-padding md:pt-0 md:pb-0 min-h-screen">
          {children}
        </main>
      </div>

      {/* Bottom nav — solo mobile */}
      <BottomNav />
    </div>
  );
}
