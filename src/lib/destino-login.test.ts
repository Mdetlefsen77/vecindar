import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino-login";

const ORIGEN = "https://vecindar.test";

describe("destinoSeguro", () => {
  it("U-75 · //otro.sitio va a /inicio", () => {
    expect(destinoSeguro("//otro.sitio", ORIGEN)).toBe("/inicio");
  });

  it("U-76 · /\\otro.sitio va a /inicio", () => {
    expect(destinoSeguro("/\\otro.sitio", ORIGEN)).toBe("/inicio");
  });

  it("U-77 · /<tab>/otro.sitio va a /inicio", () => {
    expect(destinoSeguro("/\t/otro.sitio", ORIGEN)).toBe("/inicio");
  });

  it("U-78 · javascript:alert(1) va a /inicio", () => {
    expect(destinoSeguro("javascript:alert(1)", ORIGEN)).toBe("/inicio");
  });

  it("U-79 · una URL absoluta del mismo origen queda como ruta", () => {
    expect(destinoSeguro("https://vecindar.test/avisos?x=1", ORIGEN)).toBe(
      "/avisos?x=1",
    );
  });

  it("U-80 · /%2F%2Fotro.sitio es una ruta del sitio y no se decodifica", () => {
    expect(destinoSeguro("/%2F%2Fotro.sitio", ORIGEN)).toBe(
      "/%2F%2Fotro.sitio",
    );
  });
});
