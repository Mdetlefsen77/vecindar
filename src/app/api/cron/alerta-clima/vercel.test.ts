import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  it("programa /api/cron/alerta-clima todos los días a las 11 UTC", () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons: { path: string; schedule: string }[] };

    const cron = config.crons.find((c) => c.path === "/api/cron/alerta-clima");

    expect(cron?.schedule).toBe("0 11 * * *");
  });
});
