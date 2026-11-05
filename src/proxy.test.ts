import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.hoisted(() => vi.fn());
vi.mock("next-auth/jwt", () => ({ getToken }));

import { config, proxy } from "./proxy";

describe("proxy", () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it("U-15 · /clima sin token redirige a /login con callbackUrl", async () => {
    getToken.mockResolvedValue(null);

    const res = await proxy(new NextRequest("http://localhost:3000/clima"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fclima",
    );
  });

  it("U-17 · /clima con token pasa sin redirigir", async () => {
    getToken.mockResolvedValue({ sub: "u1" });

    const res = await proxy(new NextRequest("http://localhost:3000/clima"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it('U-16 · el matcher incluye "/clima/:path*"', () => {
    expect(config.matcher).toContain("/clima/:path*");
  });

  it("U-18 · sin token, /inicio y /inicio/algo redirigen a /login con callbackUrl", async () => {
    getToken.mockResolvedValue(null);

    const a = await proxy(new NextRequest("http://localhost:3000/inicio"));
    expect(a.status).toBe(307);
    expect(a.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Finicio",
    );

    const b = await proxy(new NextRequest("http://localhost:3000/inicio/algo"));
    expect(b.status).toBe(307);
    expect(b.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Finicio%2Falgo",
    );
  });

  it("U-19 · /login con token redirige a /inicio", async () => {
    getToken.mockResolvedValue({ sub: "u1" });

    const res = await proxy(new NextRequest("http://localhost:3000/login"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/inicio");
  });

  it("U-20 · las 12 rutas ya protegidas siguen protegidas y en el matcher", async () => {
    const rutas = [
      "/inicio",
      "/mapa",
      "/incidentes",
      "/panico",
      "/requerimientos",
      "/mascotas",
      "/seguridad",
      "/partes",
      "/oficios",
      "/avisos",
      "/mas",
      "/admin",
    ];
    getToken.mockResolvedValue(null);

    for (const ruta of rutas) {
      const res = await proxy(new NextRequest(`http://localhost:3000${ruta}`));
      expect(res.status, ruta).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname, ruta).toBe(
        "/login",
      );
      expect(config.matcher, ruta).toContain(`${ruta}/:path*`);
    }
  });
});
