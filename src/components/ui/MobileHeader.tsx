"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import PushNotificationToggle from "./PushNotificationToggle";
import { esGestor, GESTORES_REPORTES } from "@/lib/permisos";

const LogoutIcon = () => (
  <svg
    aria-hidden="true"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const WalletIcon = () => (
  <svg
    aria-hidden="true"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h18M7 15h1m4 0h1m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const PanelIcon = () => (
  <svg
    aria-hidden="true"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 3v18m0-18h9a2 2 0 012 2v14a2 2 0 01-2 2H9m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h4"
    />
  </svg>
);

const ReportesIcon = () => (
  <svg
    aria-hidden="true"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const PANEL_POR_ROL: Record<string, { href: string; label: string }> = {
  ADMIN: { href: "/admin", label: "Panel de administración" },
  SEGURIDAD: { href: "/seguridad", label: "Panel de Seguridad" },
  TESORERO: { href: "/admin/cobranza", label: "Cobranza" },
};

interface MobileHeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
}

const ITEM_CLASS =
  "w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 focus-visible:outline-none focus-visible:bg-gray-50 focus-visible:text-blue-600 transition-colors";

export default function MobileHeader({
  userName,
  userEmail,
  userRole,
}: MobileHeaderProps) {
  const panel = PANEL_POR_ROL[userRole];

  // Desplegable propio (patrón "disclosure": botón + panel) en vez del Menu
  // de Headless UI: este header se monta en todas las pantallas del panel y
  // la librería sumaba ~30 kB de JS solo para esto.
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!abierto) return;
    const alTocarAfuera = (e: PointerEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm print:hidden">
      <span className="text-xl font-bold text-brand">Vecindar</span>

      <div ref={contenedorRef} className="relative">
        <button
          ref={botonRef}
          type="button"
          aria-label="Abrir menú de cuenta"
          aria-expanded={abierto}
          aria-controls={panelId}
          onClick={() => setAbierto((v) => !v)}
          className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <span className="text-blue-700 font-semibold text-base">
            {userName.charAt(0).toUpperCase()}
          </span>
        </button>

        <div
          id={panelId}
          hidden={!abierto}
          className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white border border-gray-200 shadow-lg z-50"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-base font-medium text-gray-900 truncate">
              {userName}
            </p>
            <p className="text-sm text-gray-600 truncate">{userEmail}</p>
            <span className="inline-block mt-2 text-sm font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
              {userRole}
            </span>
            <div className="mt-3">
              <PushNotificationToggle />
            </div>
          </div>
          {/* Cerrar al tocar cualquier link, aunque lleve a la pantalla actual. */}
          <nav
            aria-label="Cuenta"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setAbierto(false);
            }}
          >
            <Link href="/mi-suscripcion" className={ITEM_CLASS}>
              <WalletIcon />
              Mi suscripción
            </Link>
            {panel && (
              <Link href={panel.href} className={ITEM_CLASS}>
                <PanelIcon />
                {panel.label}
              </Link>
            )}
            {esGestor(userRole, GESTORES_REPORTES) && (
              <Link href="/reportes" className={ITEM_CLASS}>
                <ReportesIcon />
                Reportes
              </Link>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={ITEM_CLASS.replaceAll("text-blue-600", "text-red-600")}
            >
              <LogoutIcon />
              Salir
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
