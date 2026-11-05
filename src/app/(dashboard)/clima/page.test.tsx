import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

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

function respuestaOpenMeteo(cambios: Record<string, unknown[]> = {}) {
  const texto = JSON.stringify({ daily: { ...DIAS, ...cambios } }).replace(
    `"${INF}"`,
    "1e999",
  );
  return new Response(texto, { status: 200 });
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
