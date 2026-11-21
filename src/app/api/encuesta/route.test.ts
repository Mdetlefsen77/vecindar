import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/guard", () => ({
  requireSession: vi.fn(),
  getUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { respuestaEncuesta: { create: vi.fn() } },
}));

import { NextRequest } from "next/server";
import { requireSession, getUserId } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma/client";
import { POST } from "@/app/api/encuesta/route";

function pedido(body: unknown) {
  return new NextRequest("http://localhost/api/encuesta", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T15:00:00Z"));
  vi.mocked(requireSession).mockResolvedValue({ session: {} } as never);
  vi.mocked(getUserId).mockReturnValue(7);
  vi.mocked(prisma.respuestaEncuesta.create).mockResolvedValue({} as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/encuesta", () => {
  it("I-146 una respuesta válida responde 201 y se guarda con el usuario de la sesión y la ronda actual", async () => {
    const res = await POST(
      pedido({ facilidad: 4, seLee: "SI", nps: 9, gusta: "Los avisos" }),
    );
    expect(res.status).toBe(201);
    expect(prisma.respuestaEncuesta.create).toHaveBeenCalledWith({
      data: {
        usuarioId: 7,
        ronda: "2026-T4",
        facilidad: 4,
        seLee: "SI",
        nps: 9,
        gusta: "Los avisos",
        cambiaria: null,
      },
    });
  });
});
