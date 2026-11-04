import { describe, expect, it } from "vitest";
import { estadoDelCielo } from "@/lib/clima";

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
