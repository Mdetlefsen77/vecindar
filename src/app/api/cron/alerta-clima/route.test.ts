import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enviarPushBroadcast } = vi.hoisted(() => ({
  enviarPushBroadcast: vi.fn(),
}));
vi.mock("@/lib/push/enviarPush", () => ({ enviarPushBroadcast }));

const { crearAlerta } = vi.hoisted(() => ({ crearAlerta: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { alertaClima: { create: crearAlerta } },
}));

import { GET } from "./route";

function pedido() {
  return new NextRequest("http://localhost/api/cron/alerta-clima", {
    headers: { authorization: "Bearer prueba" },
  });
}

function clima(codigoHoy: number) {
  return new Response(
    JSON.stringify({
      daily: {
        time: ["2026-11-06", "2026-11-07"],
        weather_code: [codigoHoy, 0],
        wind_gusts_10m_max: [20, 20],
        temperature_2m_max: [27, 28],
      },
    }),
    { status: 200 },
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
  vi.stubEnv("CRON_SECRET", "prueba");
  enviarPushBroadcast.mockReset();
  crearAlerta.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/alerta-clima", () => {
  it("I-58 con tormenta hoy manda la push a todos y espera el envío", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(clima(95)));
    let resolver!: () => void;
    enviarPushBroadcast.mockReturnValue(
      new Promise<void>((r) => {
        resolver = r;
      }),
    );

    let termino = false;
    const respuesta = GET(pedido()).then((r) => {
      termino = true;
      return r;
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(enviarPushBroadcast).toHaveBeenCalledWith({
      title: "Tormenta hoy",
      body: "Entrá las cosas de afuera",
      url: "/inicio",
      tag: "alerta-clima-2026-11-06",
    });
    expect(termino).toBe(false);

    resolver();
    const res = await respuesta;

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, enviado: true });
  });

  it.each([
    ["sin Authorization", undefined, "prueba"],
    ["con otro token", "Bearer otro", "prueba"],
    ["sin CRON_SECRET con Bearer undefined", "Bearer undefined", undefined],
  ])(
    "I-59 %s responde 401 sin consultar el clima ni mandar push",
    async (_n, header, secret) => {
      const fetchMock = vi.fn().mockResolvedValue(clima(95));
      vi.stubGlobal("fetch", fetchMock);
      vi.stubEnv("CRON_SECRET", secret);

      const req = new NextRequest("http://localhost/api/cron/alerta-clima", {
        headers: header ? { authorization: header } : {},
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(crearAlerta).not.toHaveBeenCalled();
      expect(enviarPushBroadcast).not.toHaveBeenCalled();
    },
  );

  it("I-60 con códigos calmos hoy y mañana responde enviado: false sin push ni registro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(clima(0)));

    const res = await GET(pedido());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, enviado: false });
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
    expect(crearAlerta).not.toHaveBeenCalled();
  });

  it("I-61 si el día ya está registrado (P2002) responde enviado: false sin push", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(clima(95)));
    crearAlerta.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const res = await GET(pedido());

    expect(crearAlerta).toHaveBeenCalledWith({
      data: { fecha: "2026-11-06" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, enviado: false });
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
  });

  it("I-62 si el registro falla con otro error responde 500 sin push", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(clima(95)));
    crearAlerta.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(pedido());

    expect(res.status).toBe(500);
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
  });

  it.each([
    ["2026-11-07T02:59:59Z", "2026-11-06"],
    ["2026-11-07T03:00:00Z", "2026-11-07"],
  ])(
    "U-40 a las %s registra y etiqueta el día de Córdoba %s",
    async (ahora, dia) => {
      const tzOriginal = process.env.TZ;
      process.env.TZ = "UTC";
      try {
        vi.setSystemTime(new Date(ahora));
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(clima(95)));
        enviarPushBroadcast.mockResolvedValue(undefined);
        crearAlerta.mockResolvedValue({});

        await GET(pedido());

        expect(crearAlerta).toHaveBeenCalledWith({ data: { fecha: dia } });
        expect(enviarPushBroadcast).toHaveBeenCalledWith(
          expect.objectContaining({ tag: `alerta-clima-${dia}` }),
        );
      } finally {
        if (tzOriginal === undefined) delete process.env.TZ;
        else process.env.TZ = tzOriginal;
      }
    },
  );
});
