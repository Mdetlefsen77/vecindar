import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { construirWrapped } = vi.hoisted(() => ({ construirWrapped: vi.fn() }));
vi.mock("@/lib/crecimiento/wrapped", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/crecimiento/wrapped")>()),
  construirWrapped,
}));

import { GET } from "./route";

function llamar(anio: string) {
  return GET(new Request(`http://localhost/wrapped/${anio}/imagen`), {
    params: Promise.resolve({ anio }),
  });
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

describe("GET /wrapped/[anio]/imagen", () => {
  it("I-115 con un año con datos responde 200 image/png con construirWrapped(2026)", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z")); // 12:00 ART

    const res = await llamar("2026");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(construirWrapped).toHaveBeenCalledWith(2026);
  });
});
