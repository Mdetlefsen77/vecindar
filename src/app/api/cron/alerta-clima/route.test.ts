import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enviarPushBroadcast } = vi.hoisted(() => ({
  enviarPushBroadcast: vi.fn(),
}));
vi.mock("@/lib/push/enviarPush", () => ({ enviarPushBroadcast }));

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
});
