import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { usuario: { findUnique: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { redirect } from "next/navigation";
import PruebaFinalizadaPage from "@/app/prueba-finalizada/page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "7", name: "Ana", email: "ana@x.com", role: "VECINO" },
  } as never);
});

describe("/prueba-finalizada", () => {
  it("I-91 con una cuenta desaprobada y la prueba vencida redirige a /cuenta-no-aprobada", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      verificado: false,
      pruebaHasta: new Date("2020-01-01T00:00:00Z"),
      suscripcion: null,
    } as never);

    await expect(PruebaFinalizadaPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/cuenta-no-aprobada");
  });
});
