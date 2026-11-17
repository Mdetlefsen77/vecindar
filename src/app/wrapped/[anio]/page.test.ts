import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { construirWrapped } = vi.hoisted(() => ({ construirWrapped: vi.fn() }));
vi.mock("@/lib/crecimiento/wrapped", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/crecimiento/wrapped")>()),
  construirWrapped,
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import WrappedPage from "./page";

async function renderizar(anio: string) {
  return renderToStaticMarkup(
    await WrappedPage({ params: Promise.resolve({ anio }) }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  construirWrapped.mockReset();
  construirWrapped.mockResolvedValue({
    anio: 2026,
    guardia: null,
    incidentesResueltos: 0,
    tiempoMedianoRespuestaSOSMin: null,
    coberturaLotesPct: 0,
    manzanaMasActiva: null,
    vecinosParticipantes: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("página /wrapped/[anio]", () => {
  it("I-120 con un año con datos muestra '2026 en tu barrio' con construirWrapped(2026)", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z")); // 12:00 ART

    const html = await renderizar("2026");

    expect(html).toContain("2026 en tu barrio");
    expect(construirWrapped).toHaveBeenCalledWith(2026);
  });

  it.each(["2025", "2027"])(
    "I-121 /wrapped/%s con el reloj en 2026 da notFound sin llamar a construirWrapped",
    async (anio) => {
      vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));

      await expect(renderizar(anio)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(construirWrapped).not.toHaveBeenCalled();
    },
  );
});
