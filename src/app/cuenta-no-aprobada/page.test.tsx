import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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
import CuentaNoAprobadaPage from "@/app/cuenta-no-aprobada/page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "7", name: "Ana", email: "ana@x.com", role: "VECINO" },
  } as never);
});

describe("/cuenta-no-aprobada", () => {
  it("I-81 con una cuenta desaprobada muestra el aviso, el pedido de hablar con un administrador y el botón Cerrar sesión", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      verificado: false,
    } as never);

    const html = renderToStaticMarkup(await CuentaNoAprobadaPage());

    expect(html).toContain("Tu cuenta no está aprobada");
    expect(html).toContain("administrador");
    expect(html).toContain("Cerrar sesión");
  });

  it("I-82 con una cuenta aprobada redirige a /inicio", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      verificado: true,
    } as never);

    await expect(CuentaNoAprobadaPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/inicio");
  });

  it("I-82 sin sesión redirige a /login", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    await expect(CuentaNoAprobadaPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
