import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/actividad", () => ({ registrarActividad: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    usuario: { findUnique: vi.fn() },
    lote: { findMany: vi.fn() },
  },
}));

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { GET } from "@/app/api/lotes/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "7", name: "Ana", email: "ana@x.com", role: "VECINO" },
  } as never);
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
    verificado: false,
    pruebaHasta: null,
  } as never);
  vi.mocked(prisma.lote.findMany).mockResolvedValue([
    {
      id: 1,
      numero: 12,
      calleFrente: "Calle 1",
      manzana: { numero: 3, zona: "A" },
      _count: { usuarios: 0 },
    },
  ] as never);
});

describe("GET /api/lotes con una cuenta desaprobada", () => {
  it("I-85 con verificado false responde 401", async () => {
    const res = await GET(new NextRequest("http://localhost/api/lotes"));

    expect(res.status).toBe(401);
    expect(prisma.lote.findMany).not.toHaveBeenCalled();
  });

  it("I-85 con verificado false y ?disponibles=true responde 200 con los lotes disponibles", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/lotes?disponibles=true"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      lotes: [
        {
          id: 1,
          numero: 12,
          calleFrente: "Calle 1",
          manzana: { numero: 3, zona: "A" },
        },
      ],
    });
  });
});
