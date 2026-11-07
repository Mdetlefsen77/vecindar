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

  it("I-72 si enviarPushBroadcast rechaza responde 500, con el día registrado y sin la clave en el log", async () => {
    vi.stubEnv("OPEN_METEO_API_KEY", "clave-secreta-123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(clima(95)));
    crearAlerta.mockResolvedValue({});
    enviarPushBroadcast.mockRejectedValue(new Error("fallo del envío"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(pedido());

    expect(res.status).toBe(500);
    expect(crearAlerta).toHaveBeenCalledWith({
      data: { fecha: "2026-11-06" },
    });
    for (const llamada of log.mock.calls) {
      for (const arg of llamada) {
        expect(String(arg)).not.toContain("clave-secreta-123");
      }
    }
  });

  it("I-64 si Open-Meteo responde 500 con un cuerpo de tormenta responde 502 sin push ni registro", async () => {
    const respuesta = clima(95);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(await respuesta.text(), { status: 500 }),
        ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(pedido());

    expect(res.status).toBe(502);
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
    expect(crearAlerta).not.toHaveBeenCalled();
  });

  it("I-66 si Open-Meteo responde 200 sin daily responde 502 sin push ni registro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(pedido());

    expect(res.status).toBe(502);
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
    expect(crearAlerta).not.toHaveBeenCalled();
  });

  const serieCompleta = {
    time: ["2026-11-06", "2026-11-07"],
    weather_code: [95, 0],
    wind_gusts_10m_max: [20, 20],
    temperature_2m_max: [27, 28],
  };
  const sinSerie = (clave: string) => {
    const daily: Record<string, unknown> = { ...serieCompleta };
    delete daily[clave];
    return JSON.stringify({ daily });
  };
  it.each([
    ["daily vacío", JSON.stringify({ daily: {} })],
    ["sin weather_code", sinSerie("weather_code")],
    ["sin wind_gusts_10m_max", sinSerie("wind_gusts_10m_max")],
    ["sin temperature_2m_max", sinSerie("temperature_2m_max")],
    ["cuerpo que no es JSON", "<html>no es json</html>"],
  ])(
    "I-74 si Open-Meteo responde 200 con %s responde 502 sin push ni registro",
    async (_caso, cuerpo) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(cuerpo, { status: 200 })),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await GET(pedido());

      expect(res.status).toBe(502);
      expect(enviarPushBroadcast).not.toHaveBeenCalled();
      expect(crearAlerta).not.toHaveBeenCalled();
    },
  );

  it("I-65 si fetch rechaza responde 502 sin push ni registro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(pedido());

    expect(res.status).toBe(502);
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
    expect(crearAlerta).not.toHaveBeenCalled();
  });

  it.each([
    [
      "fetch rechaza con la URL en el mensaje",
      () =>
        vi
          .fn()
          .mockRejectedValue(
            new TypeError(
              "fetch failed https://api.open-meteo.com/v1/forecast?apikey=clave-secreta-123",
            ),
          ),
    ],
    [
      "responde 500 con la clave en res.url",
      () =>
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          url: "https://api.open-meteo.com/v1/forecast?apikey=clave-secreta-123",
        } as unknown as Response),
    ],
  ])(
    "I-67 si %s, ni la respuesta ni el log muestran la clave",
    async (_caso, crearFetch) => {
      vi.stubEnv("OPEN_METEO_API_KEY", "clave-secreta-123");
      vi.stubGlobal("fetch", crearFetch());
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      log.mockClear();

      const res = await GET(pedido());

      expect(res.status).toBe(502);
      expect(await res.text()).not.toContain("clave-secreta-123");
      expect(log).toHaveBeenCalled();
      for (const llamada of log.mock.calls) {
        for (const arg of llamada) {
          expect(String(arg)).not.toContain("clave-secreta-123");
        }
      }
    },
  );

  it("I-73 si Open-Meteo no responde sigue pendiente a los 4999 ms y da 502 a los 5000 ms", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    let status: number | undefined;
    const respuesta = GET(pedido()).then((r) => {
      status = r.status;
      return r;
    });

    await vi.advanceTimersByTimeAsync(4999);
    expect(status).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(status).toBe(502);
    await respuesta;
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
    expect(crearAlerta).not.toHaveBeenCalled();
  });

  it("I-75 si los headers llegan a tiempo pero el cuerpo no llega, da 502 a los 5000 ms", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_url: string, init?: RequestInit) =>
          ({
            ok: true,
            status: 200,
            json: () =>
              new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () =>
                  reject(new DOMException("aborted", "AbortError")),
                );
              }),
          }) as unknown as Response,
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    let status: number | undefined;
    const respuesta = GET(pedido()).then((r) => {
      status = r.status;
      return r;
    });

    await vi.advanceTimersByTimeAsync(4999);
    expect(status).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(status).toBe(502);
    await respuesta;
    expect(enviarPushBroadcast).not.toHaveBeenCalled();
    expect(crearAlerta).not.toHaveBeenCalled();
  });

  it("I-68 consulta sin caché, 2 días, las tres series, la zona de Córdoba y las coordenadas del barrio", async () => {
    const fetchMock = vi.fn().mockResolvedValue(clima(0));
    vi.stubGlobal("fetch", fetchMock);

    await GET(pedido());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const params = new URL(url).searchParams;
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
    expect(params.get("forecast_days")).toBe("2");
    expect(params.get("daily")?.split(",").sort()).toEqual([
      "temperature_2m_max",
      "weather_code",
      "wind_gusts_10m_max",
    ]);
    expect(params.get("timezone")).toBe("America/Argentina/Cordoba");
    expect(params.get("latitude")).toBe("-31.495963");
    expect(params.get("longitude")).toBe("-64.277734");
  });

  it("I-69 con OPEN_METEO_URL y OPEN_METEO_API_KEY consulta esa base con apikey; sin ellas, la base pública y sin apikey", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => clima(0));
    vi.stubGlobal("fetch", fetchMock);

    vi.stubEnv("OPEN_METEO_URL", "https://clima.ejemplo.test");
    vi.stubEnv("OPEN_METEO_API_KEY", "clave-de-prueba");
    await GET(pedido());
    const configurada = new URL(fetchMock.mock.calls[0][0]);
    expect(configurada.origin).toBe("https://clima.ejemplo.test");
    expect(configurada.pathname).toBe("/v1/forecast");
    expect(configurada.searchParams.get("apikey")).toBe("clave-de-prueba");

    vi.stubEnv("OPEN_METEO_URL", undefined);
    vi.stubEnv("OPEN_METEO_API_KEY", undefined);
    await GET(pedido());
    const porDefecto = new URL(fetchMock.mock.calls[1][0]);
    expect(porDefecto.origin).toBe("https://api.open-meteo.com");
    expect(porDefecto.pathname).toBe("/v1/forecast");
    expect(porDefecto.searchParams.has("apikey")).toBe(false);
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
