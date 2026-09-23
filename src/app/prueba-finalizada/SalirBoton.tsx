"use client";

import { signOut } from "next-auth/react";

export default function SalirBoton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full min-h-[44px] rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      Cerrar sesión
    </button>
  );
}
