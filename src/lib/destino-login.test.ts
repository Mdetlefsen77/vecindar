import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino-login";

const ORIGEN = "https://vecindar.test";

describe("destinoSeguro", () => {
  it("U-75 · //otro.sitio va a /inicio", () => {
    expect(destinoSeguro("//otro.sitio", ORIGEN)).toBe("/inicio");
  });
});
