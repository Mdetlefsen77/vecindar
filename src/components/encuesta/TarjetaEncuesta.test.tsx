// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TarjetaEncuesta } from "./TarjetaEncuesta";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const MENSAJE_ERROR = "No pudimos enviar tus respuestas. Probá de nuevo.";

// Recorre la tarjeta desde "Responder" hasta la pantalla con el botón Enviar.
function llegarAEnviar({
  seLee = "Sí",
  gusta,
}: { seLee?: string; gusta?: string } = {}) {
  fireEvent.click(screen.getByRole("button", { name: "Responder" }));
  fireEvent.click(screen.getByRole("button", { name: "Carita 4" }));
  fireEvent.click(screen.getByRole("button", { name: seLee }));
  fireEvent.click(screen.getByRole("button", { name: "9" }));
  if (gusta !== undefined) {
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: gusta },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
}

describe("TarjetaEncuesta", () => {
  it("I-150 · responde paso a paso, envía a /api/encuesta y agradece", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    llegarAEnviar({ gusta: "Los avisos" });
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

  it("I-157 · elegir No en la pregunta 2 envía seLee NO", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    llegarAEnviar({ seLee: "No" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(init.body as string)).toEqual({
      facilidad: 4,
      seLee: "NO",
      nps: 9,
    });
  });

  it("I-152 · el servidor responde 409 y se muestra Ya respondiste esta encuesta", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "Ya respondiste" }), {
          status: 409,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    llegarAEnviar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() =>
      expect(screen.getByText("Ya respondiste esta encuesta")).toBeTruthy(),
    );
    expect(screen.queryByText("¡Gracias por contarnos!")).toBeNull();
  });

  it("I-153 · con 500 muestra el error, deja reintentar y reenvía las mismas respuestas", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    llegarAEnviar({ gusta: "Los avisos" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() =>
      expect(screen.getByText(MENSAJE_ERROR)).toBeTruthy(),
    );
    expect(screen.queryByText("¡Gracias por contarnos!")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() =>
      expect(screen.getByText("¡Gracias por contarnos!")).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const cuerpos = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    );
    expect(cuerpos[1]).toEqual(cuerpos[0]);
    expect(cuerpos[1]).toEqual({
      facilidad: 4,
      seLee: "SI",
      nps: 9,
      gusta: "Los avisos",
    });
  });

  it("I-153 · si el fetch lanza (sin conexión) muestra el mismo error y deja reintentar", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    render(<TarjetaEncuesta />);

    llegarAEnviar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await vi.waitFor(() =>
      expect(screen.getByText(MENSAJE_ERROR)).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Enviar" })).toBeTruthy();
  });
});
