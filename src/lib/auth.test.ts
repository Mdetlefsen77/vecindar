import { describe, it, expect, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma/client", () => ({
  prisma: { usuario: { findUnique } },
}));

vi.mock("next-auth", () => ({
  default: () => ({}),
  CredentialsSignin: class {},
}));
vi.mock("next-auth/providers/credentials", () => ({ default: () => ({}) }));

import { authConfig } from "@/lib/auth";

describe("callbacks de NextAuth", () => {
  it("I-95 · el rol de la sesión sale de la base, no del token", async () => {
    findUnique.mockResolvedValue({ rol: "VECINO" });
    const token = { id: "7", role: "ADMIN", loteId: 3 };

    const jwt = await authConfig.callbacks.jwt({ token } as never);
    const session = await authConfig.callbacks.session({
      session: { user: {} },
      token: jwt,
    } as never);

    expect(session.user.role).toBe("VECINO");
  });

  it("I-96 · un rol de gestión dado en la base rige sin volver a loguearse", async () => {
    findUnique.mockResolvedValue({ rol: "SEGURIDAD" });
    const token = { id: "7", role: "VECINO", loteId: 3 };

    const jwt = await authConfig.callbacks.jwt({ token } as never);

    expect(jwt.role).toBe("SEGURIDAD");
  });
});
