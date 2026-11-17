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

  it("I-116 con un año anterior a Vecindar responde 404 sin llamar a construirWrapped", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));

    const res = await llamar("2025");

    expect(res.status).toBe(404);
    expect(construirWrapped).not.toHaveBeenCalled();
  });

  it("I-117 con un año futuro responde 404 sin llamar a construirWrapped", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));

    const res = await llamar("2027");

    expect(res.status).toBe(404);
    expect(construirWrapped).not.toHaveBeenCalled();
  });

  it("I-118 el 31/12 a las 23:30 ART un año futuro sigue en 404 aunque en UTC ya sea 1/1", async () => {
    const tzOriginal = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      vi.setSystemTime(new Date("2027-01-01T02:30:00Z")); // 31/12/2026 23:30 ART

      const res = await llamar("2027");

      expect(res.status).toBe(404);
      expect(construirWrapped).not.toHaveBeenCalled();
    } finally {
      if (tzOriginal === undefined) delete process.env.TZ;
      else process.env.TZ = tzOriginal;
    }
  });

  it("I-119 el 1/1 a las 00:30 ART el año nuevo ya responde 200", async () => {
    vi.setSystemTime(new Date("2027-01-01T03:30:00Z")); // 00:30 ART

    const res = await llamar("2027");

    expect(res.status).toBe(200);
    expect(construirWrapped).toHaveBeenCalledWith(2027);
  });

  it("I-122 un año mal escrito (2026abc, 02026) responde 404 sin llamar a construirWrapped", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));

    for (const anio of ["2026abc", "02026"]) {
      const res = await llamar(anio);

      expect(res.status, anio).toBe(404);
    }
    expect(construirWrapped).not.toHaveBeenCalled();
  });

  it("I-123 un año absurdo (99999999) responde 404 sin llamar a construirWrapped", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));

    const res = await llamar("99999999");

    expect(res.status).toBe(404);
    expect(construirWrapped).not.toHaveBeenCalled();
  });
});
