import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
});
