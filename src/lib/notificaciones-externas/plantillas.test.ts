import { describe, expect, it } from "vitest";
import { plantillaAviso, type AutorPlantilla } from "./plantillas";

const autor: AutorPlantilla = {
  nombre: "Ana",
  apellido: "Pérez",
  ocultarNombreEnPublicacionExterna: false,
};

function lineaDetalle(detalle: string | null): string {
  const mensaje = plantillaAviso(
    autor,
    {
      emoji: "💡",
      tipo: "Corte de luz",
      ubicacion: "calle K esq. 3",
      detalle,
      vencimiento: "Vence hoy a las 18:00",
    },
    "https://vecindar.test/avisos",
  );
  return mensaje.split("\n")[3];
}

describe("plantillaAviso · adelanto del detalle", () => {
  it("U-47 · con más de 5 palabras corta en la quinta y agrega …", () => {
    expect(lineaDetalle("uno dos tres cuatro cinco seis")).toBe(
      "uno dos tres cuatro cinco…",
    );
  });

  it("U-48 · con exactamente 5 palabras sale completo, sin …", () => {
    expect(lineaDetalle("uno dos tres cuatro cinco")).toBe(
      "uno dos tres cuatro cinco",
    );
  });

  it("U-49 · une con un espacio simple palabras separadas por espacios dobles, saltos y tabs", () => {
    expect(lineaDetalle("Hay  un\nauto sospechoso\ten la esquina")).toBe(
      "Hay un auto sospechoso en…",
    );
  });

  it("U-50 · un detalle corto con salto de línea sale en una sola línea, sin …", () => {
    expect(lineaDetalle("Corte de\nluz")).toBe("Corte de luz");
  });
});
