import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/actividad", () => ({ registrarActividad: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { usuario: { findUnique: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { registrarActividad } from "@/lib/actividad";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession, requireSession } from "@/lib/api/guard";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "7", name: "Ana", email: "ana@x.com", role: "VECINO" },
  } as never);
});

describe("requireSession con una cuenta desaprobada", () => {
  it("I-83 con verificado false responde 401 y no registra actividad", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      verificado: false,
      pruebaHasta: null,
    } as never);

    const res = await requireSession();

    expect(res.session).toBeUndefined();
    expect(res.response?.status).toBe(401);
    expect(registrarActividad).not.toHaveBeenCalled();
  });

  it("I-83 con verificado false y la prueba vencida responde 401 (no 403) y no registra actividad", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      verificado: false,
      pruebaHasta: new Date("2000-01-01T00:00:00Z"),
    } as never);

    const res = await requireSession();

    expect(res.session).toBeUndefined();
    expect(res.response?.status).toBe(401);
    expect(registrarActividad).not.toHaveBeenCalled();
  });
});

describe("requireRoleSession con una cuenta desaprobada", () => {
  it("I-84 con un ADMIN desaprobado responde 403 y no registra actividad", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "7", name: "Ana", email: "ana@x.com", role: "ADMIN" },
    } as never);
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      verificado: false,
      pruebaHasta: null,
    } as never);

    const res = await requireRoleSession(["ADMIN"]);

    expect(res.session).toBeUndefined();
    expect(res.response?.status).toBe(403);
    expect(registrarActividad).not.toHaveBeenCalled();
  });
});
