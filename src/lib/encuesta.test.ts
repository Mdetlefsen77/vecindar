import { describe, expect, it } from "vitest";
import { rondaActual } from "@/lib/encuesta";

describe("rondaActual", () => {
  it("U-84 · 2026-11-20 es el trimestre 4 de 2026", () => {
    expect(rondaActual(new Date("2026-11-20T15:00:00Z"))).toBe("2026-T4");
  });

  it("U-85 · el borde del trimestre se decide en hora de Córdoba, no en UTC ni en la del proceso", () => {
    const tzOriginal = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      // 31/3 23:59 en Córdoba
      expect(rondaActual(new Date("2026-04-01T02:59:00Z"))).toBe("2026-T1");
      // 1/4 00:00 en Córdoba
      expect(rondaActual(new Date("2026-04-01T03:00:00Z"))).toBe("2026-T2");
    } finally {
      if (tzOriginal === undefined) delete process.env.TZ;
      else process.env.TZ = tzOriginal;
    }
  });
});
