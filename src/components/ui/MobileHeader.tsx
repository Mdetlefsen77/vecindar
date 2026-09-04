"use client";

import Link from "next/link";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { signOut } from "next-auth/react";
import PushNotificationToggle from "./PushNotificationToggle";

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

export default function MobileHeader({
  userName,
  userEmail,
  userRole,
}: MobileHeaderProps) {
  const panel = PANEL_POR_ROL[userRole];

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
      <span className="text-xl font-bold text-brand">Vecindar</span>

      <Menu as="div" className="relative">
        <MenuButton aria-label="Abrir menú de cuenta" className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1">
          <span className="text-blue-700 font-semibold text-base">
            {userName.charAt(0).toUpperCase()}
          </span>
        </MenuButton>

        <MenuItems
          anchor="bottom end"
          className="w-64 rounded-xl bg-white border border-gray-200 shadow-lg z-50 focus:outline-none"
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
          <MenuItem>
            <Link
              href="/mi-suscripcion"
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-600 data-focus:bg-gray-50 data-focus:text-blue-600 transition-colors"
            >
              <WalletIcon />
              Mi suscripción
            </Link>
          </MenuItem>
          {panel && (
            <MenuItem>
              <Link
                href={panel.href}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-600 data-focus:bg-gray-50 data-focus:text-blue-600 transition-colors"
              >
                <PanelIcon />
                {panel.label}
              </Link>
            </MenuItem>
          )}
          <MenuItem>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-600 data-focus:bg-gray-50 data-focus:text-red-600 transition-colors"
            >
              <LogoutIcon />
              Salir
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </header>
  );
}
