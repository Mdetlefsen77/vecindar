import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma/client", () => ({
  prisma: { pushSubscription: { findMany, deleteMany: vi.fn() } },
}));
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

import {
  enviarPushAdmins,
  enviarPushBroadcast,
  enviarPushSoloAdmin,
  enviarPushUsuario,
  enviarPushVecinos,
} from "./enviarPush";

const payload = { title: "t", body: "b" };

function whereUsado() {
  expect(findMany).toHaveBeenCalledTimes(1);
  return findMany.mock.calls[0][0].where;
}

describe("enviarPush: solo cuentas aprobadas", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it("U-43 enviarPushBroadcast busca solo usuarios verificados", async () => {
    await enviarPushBroadcast(payload);
    expect(whereUsado().usuario).toEqual(
      expect.objectContaining({ verificado: true }),
    );
  });

  it("U-43 enviarPushVecinos busca solo usuarios verificados", async () => {
    await enviarPushVecinos(payload);
    expect(whereUsado().usuario).toEqual(
      expect.objectContaining({ verificado: true }),
    );
  });

  it("U-43 enviarPushAdmins busca solo usuarios verificados", async () => {
    await enviarPushAdmins(payload);
    expect(whereUsado().usuario).toEqual(
      expect.objectContaining({ verificado: true }),
    );
  });

  it("U-43 enviarPushSoloAdmin busca solo usuarios verificados", async () => {
    await enviarPushSoloAdmin(payload);
    expect(whereUsado().usuario).toEqual(
      expect.objectContaining({ verificado: true }),
    );
  });

  it("U-43 enviarPushUsuario busca solo si el usuario está verificado", async () => {
    await enviarPushUsuario(7, payload);
    expect(whereUsado().usuario).toEqual(
      expect.objectContaining({ verificado: true }),
    );
  });

  it("U-44 enviarPushUsuario filtra por el destinatario y verificado", async () => {
    await enviarPushUsuario(7, payload);
    expect(whereUsado()).toEqual({
      usuarioId: 7,
      usuario: { verificado: true },
    });
  });

  it("U-45 enviarPushVecinos con excluirUsuarioId excluye a ese usuario", async () => {
    await enviarPushVecinos(payload, 7);
    expect(whereUsado()).toEqual({
      usuario: { rol: { notIn: ["ADMIN", "SEGURIDAD"] }, verificado: true },
      usuarioId: { not: 7 },
    });
  });

  it("U-44 enviarPushVecinos filtra por rol fuera de gestores y verificado", async () => {
    await enviarPushVecinos(payload);
    expect(whereUsado()).toEqual({
      usuario: { rol: { notIn: ["ADMIN", "SEGURIDAD"] }, verificado: true },
    });
  });

  it("U-44 enviarPushAdmins filtra por ADMIN y SEGURIDAD y verificado", async () => {
    await enviarPushAdmins(payload);
    expect(whereUsado()).toEqual({
      usuario: { rol: { in: ["ADMIN", "SEGURIDAD"] }, verificado: true },
    });
  });

  it("U-44 enviarPushSoloAdmin filtra por ADMIN y verificado", async () => {
    await enviarPushSoloAdmin(payload);
    expect(whereUsado()).toEqual({
      usuario: { rol: { in: ["ADMIN"] }, verificado: true },
    });
  });

  it("U-44 enviarPushBroadcast sin exclusión filtra solo por verificado", async () => {
    await enviarPushBroadcast(payload);
    expect(whereUsado()).toEqual({ usuario: { verificado: true } });
  });

  it("U-44 enviarPushBroadcast con excluirUsuarioId excluye a ese usuario", async () => {
    await enviarPushBroadcast(payload, 7);
    expect(whereUsado()).toEqual({
      usuario: { verificado: true },
      usuarioId: { not: 7 },
    });
  });
});
