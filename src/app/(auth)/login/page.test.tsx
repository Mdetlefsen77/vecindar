// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn();
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(async () => ({ error: undefined })),
}));

import LoginPage from "./page";

afterEach(() => {
  cleanup();
  push.mockClear();
});

async function enviar(q: string) {
  query = q;
  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "vecino@test.com" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "secreta123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  await vi.waitFor(() => expect(push).toHaveBeenCalled());
}

describe("login · destino tras iniciar sesión", () => {
  it("I-131 · un callbackUrl externo va a /inicio", async () => {
    await enviar("callbackUrl=" + encodeURIComponent("https://otro.sitio"));
    expect(push).toHaveBeenCalledWith("/inicio");
  });

  it("I-133 · el link de registro no lleva un callbackUrl externo y sí uno interno", async () => {
    query = "callbackUrl=" + encodeURIComponent("https://otro.sitio");
    render(<LoginPage />);
    expect(screen.getByText("Registrate aquí").getAttribute("href")).toBe(
      "/registro",
    );
    cleanup();

    query = "callbackUrl=" + encodeURIComponent("/incidentes/12");
    render(<LoginPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("Registrate aquí").getAttribute("href")).toBe(
        "/registro?callbackUrl=%2Fincidentes%2F12",
      ),
    );
  });
});
