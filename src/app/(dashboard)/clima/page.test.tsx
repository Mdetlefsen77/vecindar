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
});

describe("/clima", () => {
  it("I-21 muestra mañana y los dos días siguientes, sin hoy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: {
              time: ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"],
              weather_code: [0, 2, 3, 61],
              temperature_2m_max: [31.4, 25.2, 26.6, 22.1],
              temperature_2m_min: [17.4, 15.2, 16.1, 14.3],
              precipitation_probability_max: [0, 10, 30, 80],
            },
          }),
          { status: 200 },
        ),
      ),
    );

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
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          daily: {
            time: ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"],
            weather_code: [0, 2, 3, 61],
            temperature_2m_max: [31.4, 25.2, 26.6, 22.1],
            temperature_2m_min: [17.4, 15.2, 16.1, 14.3],
            precipitation_probability_max: [0, 10, 30, 80],
          },
        }),
        { status: 200 },
      ),
    );
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
});
