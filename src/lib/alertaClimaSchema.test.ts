import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("schema de AlertaClima", () => {
  it("la fecha es única, para que dos corridas no registren el mismo día", () => {
    const schema = readFileSync(
      join(process.cwd(), "prisma", "schema.prisma"),
      "utf8",
    );
    const modelo = schema.match(/model AlertaClima \{[^}]*\}/)?.[0] ?? "";

    expect(modelo).toMatch(/^\s*fecha\s+String\s+@unique\s*$/m);
  });
});
