import { describe, expect, it } from "vitest";
import { rondaActual } from "@/lib/encuesta";

describe("rondaActual", () => {
  it("U-84 · 2026-11-20 es el trimestre 4 de 2026", () => {
    expect(rondaActual(new Date("2026-11-20T15:00:00Z"))).toBe("2026-T4");
  });
});
