import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/actividad", () => ({ registrarActividad: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    suscripcion: { findUnique: vi.fn() },
    usuario: { findUnique: vi.fn() },
  },
}));
vi.mock("@/components/ui/Sidebar", () => ({ default: () => null }));
vi.mock("@/components/ui/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/ui/MobileHeader", () => ({ default: () => null }));
vi.mock("@/components/ui/InstallPrompt", () => ({ default: () => null }));
vi.mock("@/components/ui/PushOptInBanner", () => ({ default: () => null }));
vi.mock("@/components/ui/CobranzaBanner", () => ({ default: () => null }));
vi.mock("@/components/ui/PruebaBanner", () => ({ default: () => null }));
vi.mock("@/components/ui/SosAlertListener", () => ({ default: () => null }));

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import DashboardLayout from "@/app/(dashboard)/layout";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "7", name: "Ana", email: "ana@x.com", role: "VECINO" },
  } as never);
  vi.mocked(prisma.suscripcion.findUnique).mockResolvedValue(null as never);
});

describe("layout del dashboard", () => {
  it("I-79 redirige a /cuenta-no-aprobada si la cuenta tiene verificado: false", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      pruebaHasta: null,
      verificado: false,
    } as never);

    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith("/cuenta-no-aprobada");
  });
});
