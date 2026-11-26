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
import { Prisma } from "@/generated/client";
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

  it("I-148 si create falla con P2002 (ya respondió la ronda) responde 409 con error", async () => {
    vi.mocked(prisma.respuestaEncuesta.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.4.1",
      }),
    );
    const res = await POST(
      pedido({ facilidad: 4, seLee: "SI", nps: 9, gusta: "Los avisos" }),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: expect.any(String),
    });
  });

  it("I-159 si create falla con otro código de Prisma (P2003) el error se relanza y no responde 409", async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      { code: "P2003", clientVersion: "7.4.1" },
    );
    vi.mocked(prisma.respuestaEncuesta.create).mockRejectedValue(error);
    await expect(
      POST(pedido({ facilidad: 4, seLee: "SI", nps: 9 })),
    ).rejects.toBe(error);
  });

  it("I-159 si create falla con un Error común el error se relanza y no responde 409", async () => {
    const error = new Error("conexión caída");
    vi.mocked(prisma.respuestaEncuesta.create).mockRejectedValue(error);
    await expect(
      POST(pedido({ facilidad: 4, seLee: "SI", nps: 9 })),
    ).rejects.toBe(error);
  });

  it("I-147 ignora usuarioId y ronda del body: se guarda con el usuario de la sesión y la ronda actual", async () => {
    const res = await POST(
      pedido({
        facilidad: 4,
        seLee: "SI",
        nps: 9,
        usuarioId: 99,
        ronda: "2020-T1",
      }),
    );
    expect(res.status).toBe(201);
    expect(prisma.respuestaEncuesta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ usuarioId: 7, ronda: "2026-T4" }),
    });
  });

  it("I-149 con facilidad fuera de rango responde 400 y no guarda", async () => {
    const res = await POST(pedido({ facilidad: 6, seLee: "SI", nps: 9 }));
    expect(res.status).toBe(400);
    expect(prisma.respuestaEncuesta.create).not.toHaveBeenCalled();
  });

  it("I-155 sin sesión responde 401 y no guarda", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
      }),
    } as never);
    const res = await POST(pedido({ facilidad: 4, seLee: "SI", nps: 9 }));
    expect(res.status).toBe(401);
    expect(prisma.respuestaEncuesta.create).not.toHaveBeenCalled();
  });
});
