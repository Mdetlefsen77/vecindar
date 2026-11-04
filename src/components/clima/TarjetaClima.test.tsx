import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TarjetaClima } from "@/components/clima/TarjetaClima";

afterEach(() => {
  vi.unstubAllGlobals();
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
});
