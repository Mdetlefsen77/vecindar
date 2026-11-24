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

  it("I-151 · Anterior vuelve a la pregunta 2 y la nueva respuesta reemplaza a la primera", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    fireEvent.click(screen.getByRole("button", { name: "Carita 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    expect(
      screen.getByText("Del 0 al 10, ¿cuánto se la recomendarías a un vecino?"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(
      screen.getByText("¿Se leen bien los textos y botones?"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Más o menos" }));
    fireEvent.click(screen.getByRole("button", { name: "9" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(init.body as string)).toEqual({
      facilidad: 4,
      seLee: "MAS_O_MENOS",
      nps: 9,
    });
  });
});
