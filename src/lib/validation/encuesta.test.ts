import { describe, it, expect } from "vitest";
import { encuestaSchema } from "./encuesta";

const base = { facilidad: 3, seLee: "SI", nps: 5 };

describe("encuestaSchema", () => {
  it("U-87 facilidad: 0 y 6 inválidos; 1 y 5 válidos", () => {
    expect(encuestaSchema.safeParse({ ...base, facilidad: 0 }).success).toBe(
      false,
    );
    expect(encuestaSchema.safeParse({ ...base, facilidad: 6 }).success).toBe(
      false,
    );
    expect(encuestaSchema.safeParse({ ...base, facilidad: 1 }).success).toBe(
      true,
    );
    expect(encuestaSchema.safeParse({ ...base, facilidad: 5 }).success).toBe(
      true,
    );
  });
});
