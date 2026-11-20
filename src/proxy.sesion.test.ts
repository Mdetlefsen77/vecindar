import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";

// Sin mock de next-auth/jwt: usa el getToken real (ver HU-13).
import { proxy } from "./proxy";

const SECRET = "secreto-de-prueba-HU-13";

function token(salt: string) {
  return encode({ token: { sub: "u1" }, secret: SECRET, salt });
}

describe("proxy · cookie de sesión según el protocolo (getToken real)", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("U-65 · sin AUTH_URL ni NEXTAUTH_URL, https con __Secure-authjs.session-token válida no redirige", async () => {
    const nombre = "__Secure-authjs.session-token";
    const req = new NextRequest("https://vecindar.test/inicio", {
      headers: { cookie: `${nombre}=${await token(nombre)}` },
    });

    const res = await proxy(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("U-69 · sin AUTH_URL ni NEXTAUTH_URL, http con x-forwarded-proto https y __Secure-authjs.session-token válida no redirige", async () => {
    const nombre = "__Secure-authjs.session-token";
    const req = new NextRequest("http://vecindar.test/inicio", {
      headers: {
        "x-forwarded-proto": "https",
        cookie: `${nombre}=${await token(nombre)}`,
      },
    });

    const res = await proxy(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("U-66 · con AUTH_URL http, https con authjs.session-token válida no redirige", async () => {
    vi.stubEnv("AUTH_URL", "http://vecindar.test");
    const nombre = "authjs.session-token";
    const req = new NextRequest("https://vecindar.test/inicio", {
      headers: { cookie: `${nombre}=${await token(nombre)}` },
    });

    const res = await proxy(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("U-67 · con NEXTAUTH_URL http y sin AUTH_URL, https con authjs.session-token válida no redirige", async () => {
    vi.stubEnv("NEXTAUTH_URL", "http://vecindar.test");
    const nombre = "authjs.session-token";
    const req = new NextRequest("https://vecindar.test/inicio", {
      headers: { cookie: `${nombre}=${await token(nombre)}` },
    });

    const res = await proxy(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("U-74 · con AUTH_URL https, http con x-forwarded-proto http y __Secure-authjs.session-token válida no redirige", async () => {
    vi.stubEnv("AUTH_URL", "https://vecindar.test");
    const nombre = "__Secure-authjs.session-token";
    const req = new NextRequest("http://vecindar.test/inicio", {
      headers: {
        "x-forwarded-proto": "http",
        cookie: `${nombre}=${await token(nombre)}`,
      },
    });

    const res = await proxy(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("U-73 · con AUTH_URL http y NEXTAUTH_URL https, https con authjs.session-token válida no redirige", async () => {
    vi.stubEnv("AUTH_URL", "http://vecindar.test");
    vi.stubEnv("NEXTAUTH_URL", "https://vecindar.test");
    const nombre = "authjs.session-token";
    const req = new NextRequest("https://vecindar.test/inicio", {
      headers: { cookie: `${nombre}=${await token(nombre)}` },
    });

    const res = await proxy(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });
});
