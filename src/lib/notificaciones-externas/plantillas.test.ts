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

  it("U-53 · los espacios al principio y el salto al final no dejan huecos en la línea", () => {
    expect(lineaDetalle("  Corte de luz\n")).toBe("Corte de luz");
  });
});

describe("plantillaAviso · mensaje completo", () => {
  const aviso = {
    emoji: "💡",
    tipo: "Corte de luz",
    ubicacion: "calle K esq. 3",
    vencimiento: "Vence hoy a las 18:00",
  };
  const link = "https://vecindar.test/avisos";

  it("U-51 · sin detalle el mensaje queda como siempre, sin línea extra", () => {
    expect(plantillaAviso(autor, { ...aviso, detalle: null }, link)).toBe(
      "💡 AVISO DEL BARRIO: CORTE DE LUZ\n\n📍 *calle K esq. 3*\n\nAvisó Ana P. · vence hoy a las 18:00\n\nSi ya se resolvió, avisá en Vecindar 👉 https://vecindar.test/avisos",
    );
  });

  it("U-52 · con detalle corto el mensaje completo es el de siempre", () => {
    expect(
      plantillaAviso(autor, { ...aviso, detalle: "Vuelve a la tarde" }, link),
    ).toBe(
      "💡 AVISO DEL BARRIO: CORTE DE LUZ\n\n📍 *calle K esq. 3*\nVuelve a la tarde\n\nAvisó Ana P. · vence hoy a las 18:00\n\nSi ya se resolvió, avisá en Vecindar 👉 https://vecindar.test/avisos",
    );
  });
});
