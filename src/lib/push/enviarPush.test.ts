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
});
