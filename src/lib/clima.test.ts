import { afterEach, describe, expect, it } from "vitest";
import { estadoDelCielo, nombreDelDia, fondoDelCielo } from "@/lib/clima";

describe("estadoDelCielo", () => {
  it.each([
    [0, "Despejado"],
    [1, "Mayormente despejado"],
    [2, "Parcialmente nublado"],
    [3, "Nublado"],
    [45, "Niebla"],
    [48, "Niebla"],
    [51, "Llovizna"],
    [57, "Llovizna"],
    [61, "Lluvia"],
    [67, "Lluvia"],
    [80, "Lluvia"],
    [82, "Lluvia"],
    [71, "Nieve"],
    [77, "Nieve"],
    [85, "Nieve"],
    [86, "Nieve"],
    [95, "Tormenta"],
    [99, "Tormenta"],
  ])("U-6 código %i → %s con ícono no vacío", (codigo, texto) => {
    const estado = estadoDelCielo(codigo);

    expect(estado?.texto).toBe(texto);
    expect(estado?.icono.length).toBeGreaterThan(0);
  });

  it.each([4, 44, 46, 47, 49, 50, 58, 60, 68, 70, 78, 79, 83, 84, 87, 94, 100])(
    "U-7 código desconocido %i → sin estado",
    (codigo) => {
      expect(estadoDelCielo(codigo)).toBeNull();
    },
  );
});

describe("nombreDelDia", () => {
  it("U-13 fecha ISO → día de la semana en mayúscula inicial y número", () => {
    expect(nombreDelDia("2026-11-06")).toBe("Viernes 6");
  });

  describe("con otra zona horaria en el proceso", () => {
    const tzOriginal = process.env.TZ;
    afterEach(() => {
      if (tzOriginal === undefined) delete process.env.TZ;
      else process.env.TZ = tzOriginal;
    });

    it("U-14 con TZ=America/Argentina/Cordoba sigue siendo Viernes 6", () => {
      process.env.TZ = "America/Argentina/Cordoba";
      expect(nombreDelDia("2026-11-06")).toBe("Viernes 6");
    });
  });
});

describe("fondoDelCielo", () => {
  it("U-23 cada cielo tiene su fondo, y sin estado usa el de cielo claro", () => {
    const lluvia = fondoDelCielo(estadoDelCielo(61));
    const tormenta = fondoDelCielo(estadoDelCielo(95));

    expect(lluvia).not.toBe(tormenta);
    expect(fondoDelCielo(null)).toBe(fondoDelCielo(estadoDelCielo(0)));
  });

  it("U-24 ningún fondo usa el rojo de las emergencias", () => {
    const codigos = [0, 1, 2, 3, 45, 51, 61, 71, 95];

    for (const codigo of codigos) {
      const fondo = fondoDelCielo(estadoDelCielo(codigo));
      expect(fondo).toContain("bg-gradient-to-br");
      expect(fondo).not.toContain("red-");
    }
  });
});
