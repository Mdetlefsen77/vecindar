import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ClimaPage from "@/app/(dashboard)/clima/page";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const DIAS = {
  time: ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"],
  weather_code: [0, 2, 3, 61],
  temperature_2m_max: [31.4, 25.2, 26.6, 22.1],
  temperature_2m_min: [17.4, 15.2, 16.1, 14.3],
  precipitation_probability_max: [0, 10, 30, 80],
};

// JSON.stringify convierte Infinity en null: se arma el texto con 1e999 literal
const INF = "__INF__";

function respuestaOpenMeteo(
  cambios: Record<string, unknown[]> = {},
  status = 200,
) {
  const texto = JSON.stringify({ daily: { ...DIAS, ...cambios } }).replace(
    `"${INF}"`,
    "1e999",
  );
  return new Response(texto, { status });
}

function esperarError(html: string) {
  expect(html).toContain("No pudimos traer el pronóstico, probá más tarde");
  expect(html).toMatch(/<a [^>]*href="\/inicio"[^>]*>Volver al inicio<\/a>/);
  expect(html).not.toContain("Mañana");
}

describe("/clima", () => {
  it("I-21 muestra mañana y los dos días siguientes, sin hoy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaOpenMeteo()));

    const html = renderToStaticMarkup(await ClimaPage());

    expect(html).toContain("Mañana");
    expect(html).toContain("Viernes 6");
    expect(html).toContain("Sábado 7");
    expect(html).toContain("⛅");
    expect(html).toContain("Parcialmente nublado");
    expect(html).toContain("☁️");
    expect(html).toContain("Nublado");
    expect(html).toContain("🌧️");
    expect(html).toContain("Lluvia");
    expect(html).toContain("Máx 25°C");
    expect(html).toContain("Mín 15°C");
    expect(html).toContain("Lluvia 10%");
    expect(html).not.toContain("Miércoles 4");
    expect(html).not.toContain("Jueves 5");
    expect(html).not.toContain("31°C");
    expect(html).not.toContain("Despejado");
    expect(html).not.toContain("red-");
  });

  it("I-22 la consulta pide coordenadas, 4 días, zona de Córdoba, campos diarios y revalidate 1800", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaOpenMeteo());
    vi.stubGlobal("fetch", fetchMock);

    await ClimaPage();

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("latitude")).toBe("-31.495963");
    expect(url.searchParams.get("longitude")).toBe("-64.277734");
    expect(url.searchParams.get("forecast_days")).toBe("4");
    expect(url.searchParams.get("timezone")).toBe("America/Argentina/Cordoba");
    expect(url.searchParams.get("daily")).toBe(
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    expect(fetchMock.mock.calls[0][1].next.revalidate).toBe(1800);
  });

  it("I-31 con OPEN_METEO_URL y OPEN_METEO_API_KEY la consulta va a esa base con apikey; sin ellas, al host por defecto sin apikey", async () => {
    vi.stubEnv("OPEN_METEO_URL", "https://customer-api.open-meteo.com");
    vi.stubEnv("OPEN_METEO_API_KEY", "abc");
    const conVariables = vi.fn().mockResolvedValue(respuestaOpenMeteo());
    vi.stubGlobal("fetch", conVariables);

    await ClimaPage();

    const llamada = String(conVariables.mock.calls[0][0]);
    expect(llamada.startsWith("https://customer-api.open-meteo.com/")).toBe(
      true,
    );
    expect(new URL(llamada).searchParams.get("apikey")).toBe("abc");

    vi.stubEnv("OPEN_METEO_URL", undefined);
    vi.stubEnv("OPEN_METEO_API_KEY", undefined);
    const sinVariables = vi.fn().mockResolvedValue(respuestaOpenMeteo());
    vi.stubGlobal("fetch", sinVariables);

    await ClimaPage();

    const url = new URL(String(sinVariables.mock.calls[0][0]));
    expect(url.host).toBe("api.open-meteo.com");
    expect(url.searchParams.has("apikey")).toBe(false);
  });

  it("I-24 muestra la atribución a Open-Meteo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaOpenMeteo()));

    const html = renderToStaticMarkup(await ClimaPage());

    expect(html).toContain("Datos: Open-Meteo");
  });

  it("I-26 sin sesión redirige a /login y no llama a fetch", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    vi.mocked(redirect).mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT;replace;/login;307;");
    });
    const fetchMock = vi.fn().mockResolvedValue(respuestaOpenMeteo());
    vi.stubGlobal("fetch", fetchMock);

    await expect(ClimaPage()).rejects.toThrow("NEXT_REDIRECT;replace;/login");

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("I-27 si Open-Meteo responde 500 muestra el mensaje y el enlace a /inicio, sin días", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuestaOpenMeteo({}, 500)),
    );

    const html = renderToStaticMarkup(await ClimaPage());

    expect(html).toContain("No pudimos traer el pronóstico, probá más tarde");
    expect(html).toMatch(/<a [^>]*href="\/inicio"[^>]*>Volver al inicio<\/a>/);
    expect(html).not.toContain("Mañana");
  });

  it("I-28 si fetch rechaza muestra el mensaje y el enlace a /inicio, sin lanzar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const html = renderToStaticMarkup(await ClimaPage());

    expect(html).toContain("No pudimos traer el pronóstico, probá más tarde");
    expect(html).toMatch(/<a [^>]*href="\/inicio"[^>]*>Volver al inicio<\/a>/);
    expect(html).not.toContain("Mañana");
  });

  it("I-29 si Open-Meteo no responde, a los 3000 ms muestra el mensaje", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url: string, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener("abort", () =>
                reject(new DOMException("aborted", "AbortError")),
              );
            }),
        ),
      );
      let terminada = false;
      const pagina = ClimaPage().then((r) => {
        terminada = true;
        return r;
      });

      await vi.advanceTimersByTimeAsync(2999);
      expect(terminada).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const html = renderToStaticMarkup(await pagina);

      expect(terminada).toBe(true);
      expect(html).toContain("No pudimos traer el pronóstico, probá más tarde");
      expect(html).toMatch(
        /<a [^>]*href="\/inicio"[^>]*>Volver al inicio<\/a>/,
      );
      expect(html).not.toContain("Mañana");
    } finally {
      vi.useRealTimers();
    }
  });

  it("I-30 si daily trae solo 3 días muestra el mensaje, sin días a medias", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respuestaOpenMeteo({
          time: DIAS.time.slice(0, 3),
          weather_code: DIAS.weather_code.slice(0, 3),
          temperature_2m_max: DIAS.temperature_2m_max.slice(0, 3),
          temperature_2m_min: DIAS.temperature_2m_min.slice(0, 3),
          precipitation_probability_max:
            DIAS.precipitation_probability_max.slice(0, 3),
        }),
      ),
    );

    const html = renderToStaticMarkup(await ClimaPage());

    expect(html).toContain("No pudimos traer el pronóstico, probá más tarde");
    expect(html).toMatch(/<a [^>]*href="\/inicio"[^>]*>Volver al inicio<\/a>/);
    expect(html).not.toContain("Mañana");
    expect(html).not.toContain("Viernes 6");
  });

  describe("I-32 responde 200 pero el cuerpo no sirve", () => {
    it("(a) el cuerpo no es JSON: mensaje y enlace, sin lanzar", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response("<html>Bad gateway</html>", { status: 200 }),
          ),
      );

      esperarError(renderToStaticMarkup(await ClimaPage()));
    });

    it("(b) el JSON no trae daily: mensaje y enlace, sin lanzar", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ error: true }), { status: 200 }),
          ),
      );

      esperarError(renderToStaticMarkup(await ClimaPage()));
    });

    it("(c) el cuerpo se cuelga y a los 3000 ms se aborta: mensaje y enlace, sin lanzar", async () => {
      vi.useFakeTimers();
      try {
        vi.stubGlobal(
          "fetch",
          vi.fn((_url: string, init: { signal: AbortSignal }) => {
            const cuerpo = new ReadableStream({
              start(controlador) {
                init.signal.addEventListener("abort", () =>
                  controlador.error(new DOMException("aborted", "AbortError")),
                );
              },
            });
            return Promise.resolve(new Response(cuerpo, { status: 200 }));
          }),
        );
        let terminada = false;
        const pagina = ClimaPage().then((r) => {
          terminada = true;
          return r;
        });

        await vi.advanceTimersByTimeAsync(2999);
        expect(terminada).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        const html = renderToStaticMarkup(await pagina);

        expect(terminada).toBe(true);
        esperarError(html);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("I-33 responde 200 pero la forma del cuerpo es rara", () => {
    function sinSerie(nombre: string) {
      const daily: Record<string, unknown> = { ...DIAS };
      delete daily[nombre];
      return daily;
    }

    function responde(cuerpo: unknown) {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify(cuerpo), { status: 200 }),
          ),
      );
    }

    it("(a) el cuerpo es el JSON null: mensaje y enlace, sin lanzar", async () => {
      responde(null);

      esperarError(renderToStaticMarkup(await ClimaPage()));
    });

    it("(b) daily no trae time: mensaje y enlace, sin lanzar", async () => {
      responde({ daily: sinSerie("time") });

      esperarError(renderToStaticMarkup(await ClimaPage()));
    });

    function esperarTresDias(html: string) {
      expect(html).not.toContain("No pudimos traer");
      expect(html).toContain("Mañana");
      expect(html).toContain("Viernes 6");
      expect(html).toContain("Sábado 7");
    }

    it("(c) falta la serie temperature_2m_max entera: los 3 días sin Máx y con sus otros datos", async () => {
      responde({ daily: sinSerie("temperature_2m_max") });

      const html = renderToStaticMarkup(await ClimaPage());

      esperarTresDias(html);
      expect(html).not.toContain("Máx");
      expect(html).toContain("Mín 15°C");
      expect(html).toContain("Mín 16°C");
      expect(html).toContain("Mín 14°C");
      expect(html).toContain("Lluvia 10%");
      expect(html).toContain("Lluvia 30%");
      expect(html).toContain("Lluvia 80%");
      expect(html).toContain("Nublado");
    });

    it("(d) falta la serie temperature_2m_min entera: los 3 días sin Mín y con sus otros datos", async () => {
      responde({ daily: sinSerie("temperature_2m_min") });

      const html = renderToStaticMarkup(await ClimaPage());

      esperarTresDias(html);
      expect(html).not.toContain("Mín");
      expect(html).toContain("Máx 25°C");
      expect(html).toContain("Máx 27°C");
      expect(html).toContain("Máx 22°C");
      expect(html).toContain("Lluvia 10%");
      expect(html).toContain("Lluvia 30%");
      expect(html).toContain("Lluvia 80%");
      expect(html).toContain("Nublado");
    });

    it("(e) falta la serie precipitation_probability_max entera: los 3 días sin Lluvia y con sus otros datos", async () => {
      responde({ daily: sinSerie("precipitation_probability_max") });

      const html = renderToStaticMarkup(await ClimaPage());

      esperarTresDias(html);
      // "Lluvia" también es el estado del cielo del día 3 (código 61)
      expect(html).not.toMatch(/Lluvia \d/);
      expect(html).not.toContain("%");
      expect(html).toContain("Máx 25°C");
      expect(html).toContain("Máx 27°C");
      expect(html).toContain("Máx 22°C");
      expect(html).toContain("Mín 15°C");
      expect(html).toContain("Mín 16°C");
      expect(html).toContain("Mín 14°C");
      expect(html).toContain("Nublado");
    });

    it("(f) falta la serie weather_code entera: los 3 días sin estado y con sus otros datos", async () => {
      responde({ daily: sinSerie("weather_code") });

      const html = renderToStaticMarkup(await ClimaPage());

      esperarTresDias(html);
      expect(html).not.toContain("aria-hidden");
      expect(html).not.toContain("Nublado");
      expect(html).not.toContain("Parcialmente nublado");
      expect(html).toContain("Máx 25°C");
      expect(html).toContain("Mín 16°C");
      expect(html).toContain("Lluvia 30%");
      expect(html).toContain("Lluvia 80%");
    });
  });

  describe("I-23 datos raros por día", () => {
    async function pagina(cambios: Record<string, unknown[]>) {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            respuestaOpenMeteo({ weather_code: [0, 2, 3, 1], ...cambios }),
          ),
      );
      const html = renderToStaticMarkup(await ClimaPage());
      expect(html).not.toContain("No pudimos traer el pronóstico");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
      const desde = html.indexOf("Viernes 6");
      expect(desde).toBeGreaterThan(-1);
      const hasta = html.indexOf("Sábado 7");
      return {
        html,
        viernes: html.slice(desde, hasta),
        resto: html.slice(0, desde) + html.slice(hasta),
      };
    }

    it("(a) máxima null: ese día sin Máx, los otros con Máx", async () => {
      const { viernes, resto } = await pagina({
        temperature_2m_max: [31.4, 25.2, null, 22.1],
      });
      expect(viernes).not.toContain("Máx");
      expect(viernes).toContain("Mín 16°C");
      expect(viernes).toContain("Lluvia 30%");
      expect(resto).toContain("Máx 25°C");
      expect(resto).toContain("Máx 22°C");
    });

    it("(b) lluvia inválida: ese día sin Lluvia", async () => {
      const { viernes, resto } = await pagina({
        precipitation_probability_max: [0, 10, INF, 80],
      });
      expect(viernes).not.toContain("Lluvia");
      expect(viernes).toContain("Máx 27°C");
      expect(viernes).toContain("Mín 16°C");
      expect(resto).toContain("Lluvia 10%");
    });

    it("(c) weather_code desconocido: ese día sin estado", async () => {
      const { viernes } = await pagina({ weather_code: [0, 2, 999, 1] });
      expect(viernes).not.toContain("Nublado");
      expect(viernes).not.toContain("aria-hidden");
      expect(viernes).toContain("Máx 27°C");
      expect(viernes).toContain("Lluvia 30%");
    });

    it("(d) mínima inválida: ese día sin Mín, los otros con Mín", async () => {
      const { viernes, resto } = await pagina({
        temperature_2m_min: [17.4, 15.2, INF, 14.3],
      });
      expect(viernes).not.toContain("Mín");
      expect(viernes).toContain("Máx 27°C");
      expect(viernes).toContain("Lluvia 30%");
      expect(resto).toContain("Mín 15°C");
      expect(resto).toContain("Mín 14°C");
    });
  });
});
