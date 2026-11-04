import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TarjetaClima } from "@/components/clima/TarjetaClima";
import { estadoDelCielo } from "@/lib/clima";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TarjetaClima", () => {
  it("I-1 muestra temperatura, estado, ícono y atribución", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("24°C");
    expect(html).toContain("Parcialmente nublado");
    expect(html).toContain("⛅");
    expect(html).toContain("Datos: Open-Meteo");
  });

  it("I-6 muestra máxima, mínima y lluvia del día además de lo actual", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
            daily: {
              temperature_2m_max: [22.3],
              temperature_2m_min: [15.3],
              precipitation_probability_max: [49],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("24°C");
    expect(html).toContain("Parcialmente nublado");
    expect(html).toContain("Máx 22°C");
    expect(html).toContain("Mín 15°C");
    expect(html).toContain("Lluvia 49%");
  });

  it("I-7 con 50% de lluvia destaca el paraguas, sin rojo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
            daily: {
              temperature_2m_max: [22.3],
              temperature_2m_min: [15.3],
              precipitation_probability_max: [50],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("☔");
    expect(html).toContain("Llevá paraguas");
    expect(html).not.toContain("red-");
  });

  it("I-8 con 49% de lluvia solo muestra el porcentaje, sin paraguas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
            daily: {
              temperature_2m_max: [22.3],
              temperature_2m_min: [15.3],
              precipitation_probability_max: [49],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("Lluvia 49%");
    expect(html).not.toContain("Llevá paraguas");
  });

  it("I-2 con un error de red renderiza vacío y no lanza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const tarjeta = await TarjetaClima();

    expect(renderToStaticMarkup(tarjeta)).toBe("");
  });

  it("I-3 con status 503 y cuerpo válido renderiza vacío", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
          }),
          { status: 503 },
        ),
      ),
    );

    const tarjeta = await TarjetaClima();

    expect(renderToStaticMarkup(tarjeta)).toBe("");
  });

  it("I-4 sin temperatura numérica renderiza vacío, sin NaN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ current: { weather_code: 2 } }), {
          status: 200,
        }),
      ),
    );

    const tarjeta = await TarjetaClima();

    expect(renderToStaticMarkup(tarjeta)).toBe("");
  });

  it("U-1 la URL pide las coordenadas del barrio y los campos actuales", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { temperature_2m: 23.5, weather_code: 2 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await TarjetaClima();

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("latitude")).toBe("-31.495963");
    expect(url.searchParams.get("longitude")).toBe("-64.277734");
    expect(url.searchParams.get("current")).toBe("temperature_2m,weather_code");
  });

  it("U-11 la URL pide los datos diarios de hoy en la zona horaria de Córdoba", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { temperature_2m: 23.5, weather_code: 2 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await TarjetaClima();

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("daily")).toBe(
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    expect(url.searchParams.get("forecast_days")).toBe("1");
    expect(url.searchParams.get("timezone")).toBe("America/Argentina/Cordoba");
  });

  it("U-2 fetch recibe next.revalidate 1800", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { temperature_2m: 23.5, weather_code: 2 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await TarjetaClima();

    expect(fetchMock.mock.calls[0][1].next.revalidate).toBe(1800);
  });

  it("U-3 fetch recibe un signal que se aborta a los 3 s", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
          }),
          { status: 200 },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      await TarjetaClima();

      const signal: AbortSignal = fetchMock.mock.calls[0][1].signal;
      expect(signal).toBeInstanceOf(AbortSignal);
      vi.advanceTimersByTime(2999);
      expect(signal.aborted).toBe(false);
      vi.advanceTimersByTime(1);
      expect(signal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("U-4 sin variables usa el host por defecto y no lleva apikey", async () => {
    vi.stubEnv("OPEN_METEO_URL", undefined);
    vi.stubEnv("OPEN_METEO_API_KEY", undefined);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { temperature_2m: 23.5, weather_code: 2 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await TarjetaClima();

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.host).toBe("api.open-meteo.com");
    expect(url.searchParams.has("apikey")).toBe(false);
  });

  it("U-5 con OPEN_METEO_URL y OPEN_METEO_API_KEY usa ese host y lleva apikey", async () => {
    vi.stubEnv("OPEN_METEO_URL", "https://customer-api.open-meteo.com");
    vi.stubEnv("OPEN_METEO_API_KEY", "abc");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { temperature_2m: 23.5, weather_code: 2 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await TarjetaClima();

    const llamada = String(fetchMock.mock.calls[0][0]);
    expect(llamada.startsWith("https://customer-api.open-meteo.com")).toBe(
      true,
    );
    expect(new URL(llamada).searchParams.get("apikey")).toBe("abc");
  });

  it("U-9 solo con OPEN_METEO_API_KEY usa el host por defecto y lleva apikey", async () => {
    vi.stubEnv("OPEN_METEO_URL", undefined);
    vi.stubEnv("OPEN_METEO_API_KEY", "abc");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { temperature_2m: 23.5, weather_code: 2 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await TarjetaClima();

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.host).toBe("api.open-meteo.com");
    expect(url.searchParams.get("apikey")).toBe("abc");
  });

  it("I-5 con un código desconocido muestra solo la temperatura", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 46 },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("24°C");
    for (const codigo of [0, 1, 2, 3, 45, 51, 61, 71, 95]) {
      const estado = estadoDelCielo(codigo)!;
      expect(html).not.toContain(estado.texto);
      expect(html).not.toContain(estado.icono);
    }
  });

  it.each([
    [23.5, "24°C"],
    [23.4, "23°C"],
    [-0.4, "0°C"],
  ])("U-8 redondea %s y lo formatea como %s", async (temperatura, esperado) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: temperatura, weather_code: 2 },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain(`>${esperado}<`);
    expect(html).not.toContain("-0°C");
  });

  it.each([
    [22.5, 14.3, "Máx 23°C"],
    [22.3, 14.5, "Mín 15°C"],
    [22.3, -0.4, "Mín 0°C"],
  ])(
    "U-10 redondea máxima %s y mínima %s: muestra %s",
    async (max, min, esperado) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              current: { temperature_2m: 23.5, weather_code: 2 },
              daily: {
                temperature_2m_max: [max],
                temperature_2m_min: [min],
                precipitation_probability_max: [49],
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const html = renderToStaticMarkup(await TarjetaClima());

      expect(html).toContain(esperado);
      expect(html).not.toContain("-0°C");
    },
  );

  it("I-9 sin daily muestra lo de HU-01 y nada del día", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("24°C");
    expect(html).toContain("Parcialmente nublado");
    for (const ausente of ["Máx", "Mín", "Lluvia", "undefined", "NaN"]) {
      expect(html).not.toContain(ausente);
    }
  });

  it("I-10 daily sin la clave de la máxima muestra el resto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
            daily: {
              temperature_2m_min: [15.3],
              precipitation_probability_max: [49],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("24°C");
    expect(html).toContain("Mín 15°C");
    expect(html).toContain("Lluvia 49%");
    expect(html).not.toContain("Máx");
    expect(html).not.toContain("NaN");
  });

  it("I-11 daily con probabilidad de lluvia null omite solo la lluvia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
            daily: {
              temperature_2m_max: [22.3],
              temperature_2m_min: [15.3],
              precipitation_probability_max: [null],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("Máx 22°C");
    expect(html).toContain("Mín 15°C");
    expect(html).not.toContain("Lluvia");
    expect(html).not.toContain("Llevá paraguas");
    expect(html).not.toContain("null");
  });

  it("I-12 daily con mínima null omite solo la mínima", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: { temperature_2m: 23.5, weather_code: 2 },
            daily: {
              temperature_2m_max: [22.3],
              temperature_2m_min: [null],
              precipitation_probability_max: [49],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("Máx 22°C");
    expect(html).toContain("Lluvia 49%");
    expect(html).not.toContain("Mín");
    expect(html).not.toContain("null");
  });

  it("I-13 daily con máxima no finita (1e999) omite solo la máxima", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"current":{"temperature_2m":23.5,"weather_code":2},"daily":{"temperature_2m_max":[1e999],"temperature_2m_min":[15.3],"precipitation_probability_max":[49]}}',
            { status: 200 },
          ),
        ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("Mín 15°C");
    expect(html).toContain("Lluvia 49%");
    expect(html).not.toContain("Máx");
    expect(html).not.toContain("Infinity");
  });

  it("I-14 temperatura actual no finita (1e999) oculta la tarjeta", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"current":{"temperature_2m":1e999,"weather_code":2}}',
            { status: 200 },
          ),
        ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toBe("");
  });

  it("I-15 daily con mínima no finita (1e999) omite solo la mínima", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"current":{"temperature_2m":23.5,"weather_code":2},"daily":{"temperature_2m_max":[22.3],"temperature_2m_min":[1e999],"precipitation_probability_max":[49]}}',
            { status: 200 },
          ),
        ),
    );

    const html = renderToStaticMarkup(await TarjetaClima());

    expect(html).toContain("Máx 22°C");
    expect(html).toContain("Lluvia 49%");
    expect(html).not.toContain("Mín");
    expect(html).not.toContain("Infinity");
  });
});
