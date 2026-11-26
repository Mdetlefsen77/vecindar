import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextResponse } from "next/server";

vi.mock("@/lib/api/guard", () => ({
  requireSession: vi.fn(),
  getUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { usuario: { update: vi.fn() } },
}));

import { requireSession, getUserId } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma/client";
import { POST } from "@/app/api/encuesta/posponer/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T15:00:00Z"));
  vi.mocked(requireSession).mockResolvedValue({ session: {} } as never);
  vi.mocked(getUserId).mockReturnValue(7);
  vi.mocked(prisma.usuario.update).mockResolvedValue({} as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/encuesta/posponer", () => {
  it("I-171 con sesión responde 2xx y guarda encuestaPospuestaEn con la hora del servidor en el usuario de la sesión", async () => {
    const res = await POST();
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { encuestaPospuestaEn: new Date("2026-11-20T15:00:00Z") },
    });
  });

  it("I-172 sin sesión responde 401 y no escribe nada", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    } as never);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it("I-173 si el body trae usuarioId 99 se guarda en el usuario de la sesión (7), no en el 99", async () => {
    const req = new Request("http://localhost/api/encuesta/posponer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: 99 }),
    });
    const res = await (POST as unknown as (r: Request) => Promise<Response>)(
      req,
    );
    expect(res.status).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { encuestaPospuestaEn: new Date("2026-11-20T15:00:00Z") },
    });
  });
});
