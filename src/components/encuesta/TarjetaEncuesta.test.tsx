// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TarjetaEncuesta } from "./TarjetaEncuesta";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TarjetaEncuesta", () => {
  it("I-150 · responde paso a paso, envía a /api/encuesta y agradece", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    fireEvent.click(screen.getByRole("button", { name: "Carita 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    fireEvent.click(screen.getByRole("button", { name: "9" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Los avisos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() =>
      expect(screen.getByText("¡Gracias por contarnos!")).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/encuesta");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      facilidad: 4,
      seLee: "SI",
      nps: 9,
      gusta: "Los avisos",
    });
  });
});
