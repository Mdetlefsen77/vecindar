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

  it("I-97 · consulta el rol del usuario del token", async () => {
    findUnique.mockClear();
    findUnique.mockResolvedValue({ rol: "VECINO" });
    const token = { id: "7", role: "VECINO", loteId: 3 };

    await authConfig.callbacks.jwt({ token } as never);

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } }),
    );
  });

  it("I-101 · la consulta del rol no trae otras columnas", async () => {
    findUnique.mockClear();
    findUnique.mockResolvedValue({ rol: "VECINO" });
    const token = { id: "7", role: "VECINO", loteId: 3 };

    await authConfig.callbacks.jwt({ token } as never);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { rol: true },
    });
  });

  it("I-98 · si la base falla, conserva el rol del token y lo registra", async () => {
    const error = new Error("base caída");
    findUnique.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const token = { id: "7", role: "ADMIN", loteId: 3 };

    const jwt = await authConfig.callbacks.jwt({ token } as never);

    expect(jwt).toEqual(expect.objectContaining({ role: "ADMIN" }));
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("I-99 · en el login el token lleva id, rol y lote del usuario", async () => {
    findUnique.mockResolvedValue({ rol: "VECINO" });
    const token = {};
    const user = { id: "9", role: "ADMIN", loteId: 5 };

    const jwt = await authConfig.callbacks.jwt({ token, user } as never);

    expect(jwt).toEqual({ id: "9", role: "ADMIN", loteId: 5 });
  });
});
