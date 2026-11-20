// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(query),
}));

import RegistroPage from "./page";

afterEach(() => {
  cleanup();
});

describe("registro · link a iniciar sesión", () => {
  it("I-134 · el link de login no lleva un callbackUrl externo y sí uno interno", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({ lotes: [] }) })),
    );
    query = "callbackUrl=" + encodeURIComponent("https://otro.sitio");
    render(<RegistroPage />);
    expect(screen.getByText("Iniciá sesión").getAttribute("href")).toBe(
      "/login",
    );
    cleanup();

    query = "callbackUrl=" + encodeURIComponent("/incidentes/12");
    render(<RegistroPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("Iniciá sesión").getAttribute("href")).toBe(
        "/login?callbackUrl=%2Fincidentes%2F12",
      ),
    );
  });
});
