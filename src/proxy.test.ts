import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.hoisted(() => vi.fn());
vi.mock("next-auth/jwt", () => ({ getToken }));

import { proxy } from "./proxy";

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
});
