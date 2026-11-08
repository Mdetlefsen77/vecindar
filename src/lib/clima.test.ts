import { afterEach, describe, expect, it } from "vitest";
import {
  climaFuerte,
  estadoDelCielo,
  nombreDelDia,
  fondoDelCielo,
} from "@/lib/clima";

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

describe("climaFuerte", () => {
  it.each([
    [95, "Tormenta hoy", "Entrá las cosas de afuera", "⛈️"],
    [96, "Granizo hoy", "Guardá el auto bajo techo", "🧊"],
    [97, "Tormenta hoy", "Entrá las cosas de afuera", "⛈️"],
    [98, "Tormenta hoy", "Entrá las cosas de afuera", "⛈️"],
    [99, "Granizo hoy", "Guardá el auto bajo techo", "🧊"],
  ])("U-25 código %i → %s", (codigo, titulo, consejo, icono) => {
    expect(climaFuerte({ weather_code: [codigo, 0] })).toEqual({
      titulo,
      consejo,
      icono,
    });
  });
});

describe("climaFuerte sin alerta", () => {
  it.each([94, 100, 0, 3, 61, 82])("U-26 código %i → null", (codigo) => {
    expect(climaFuerte({ weather_code: [codigo, 0] })).toBeNull();
  });
});

describe("climaFuerte viento", () => {
  it("U-27 ráfagas de 60 → Viento fuerte hoy", () => {
    expect(
      climaFuerte({ weather_code: [0, 0], wind_gusts_10m_max: [60, 10] }),
    ).toEqual({
      titulo: "Viento fuerte hoy",
      consejo: "Asegurá lo que se pueda volar",
      icono: "💨",
    });
  });

  it("U-28 ráfagas de 59.9 → null", () => {
    expect(
      climaFuerte({ weather_code: [0, 0], wind_gusts_10m_max: [59.9, 10] }),
    ).toBeNull();
  });
});

describe("climaFuerte calor", () => {
  it.each([38, 37.5])("U-29 máxima de %s → Calor extremo hoy", (maxima) => {
    expect(
      climaFuerte({ weather_code: [0, 0], temperature_2m_max: [maxima, 20] }),
    ).toEqual({
      titulo: "Calor extremo hoy",
      consejo: "Tomá agua y evitá el sol del mediodía",
      icono: "🌡️",
    });
  });

  it("U-30 máxima de 37.4 → null", () => {
    expect(
      climaFuerte({ weather_code: [0, 0], temperature_2m_max: [37.4, 20] }),
    ).toBeNull();
  });
});

describe("climaFuerte mañana", () => {
  it.each([
    [
      { weather_code: [0, 95] },
      "Tormenta mañana",
      "Entrá las cosas de afuera",
      "⛈️",
    ],
    [
      { weather_code: [0, 96] },
      "Granizo mañana",
      "Guardá el auto bajo techo",
      "🧊",
    ],
    [
      { weather_code: [0, 0], wind_gusts_10m_max: [10, 70] },
      "Viento fuerte mañana",
      "Asegurá lo que se pueda volar",
      "💨",
    ],
    [
      { weather_code: [0, 0], temperature_2m_max: [20, 40] },
      "Calor extremo mañana",
      "Tomá agua y evitá el sol del mediodía",
      "🌡️",
    ],
  ])("U-31 hoy calmo y mañana fuerte → %s", (daily, titulo, consejo, icono) => {
    expect(climaFuerte(daily)).toEqual({ titulo, consejo, icono });
  });
});

describe("climaFuerte hoy primero", () => {
  it("U-32 hoy viento y mañana granizo → Viento fuerte hoy", () => {
    expect(
      climaFuerte({
        weather_code: [0, 96],
        wind_gusts_10m_max: [70, 10],
      }),
    ).toEqual({
      titulo: "Viento fuerte hoy",
      consejo: "Asegurá lo que se pueda volar",
      icono: "💨",
    });
  });
});

describe("climaFuerte prioridad el mismo día", () => {
  it.each([
    [96, "Granizo hoy"],
    [95, "Tormenta hoy"],
    [0, "Viento fuerte hoy"],
  ])("U-33 código %s con ráfagas y calor → %s", (codigo, titulo) => {
    expect(
      climaFuerte({
        weather_code: [codigo, 0],
        wind_gusts_10m_max: [70, 10],
        temperature_2m_max: [40, 20],
      })?.titulo,
    ).toBe(titulo);
  });
});

describe("climaFuerte con datos inválidos", () => {
  it.each([
    ["ráfagas Infinity", { wind_gusts_10m_max: JSON.parse("[1e999, 10]") }],
    ["ráfagas texto", { wind_gusts_10m_max: ["70", 10] }],
    ["máxima Infinity", { temperature_2m_max: JSON.parse("[1e999, 20]") }],
    ["máxima texto", { temperature_2m_max: ["40", 20] }],
    ["código texto", { weather_code: ["95", 0] }],
  ])("U-34 %s → null", (_nombre, serie) => {
    expect(climaFuerte({ weather_code: [0, 0], ...serie })).toBeNull();
  });
});

describe("climaFuerte con datos faltantes", () => {
  it.each([
    [
      "ráfagas null y máxima 40 → calor",
      {
        weather_code: [0, 0],
        wind_gusts_10m_max: [null, 10],
        temperature_2m_max: [40, 20],
      },
      "Calor extremo hoy",
    ],
    [
      "código null y ráfagas 70 → viento",
      { weather_code: [null, 0], wind_gusts_10m_max: [70, 10] },
      "Viento fuerte hoy",
    ],
    [
      "serie de ráfagas ausente y código 95 → tormenta",
      { weather_code: [95, 0] },
      "Tormenta hoy",
    ],
  ])("U-35 %s", (_nombre, daily, titulo) => {
    expect(climaFuerte(daily as never)?.titulo).toBe(titulo);
  });
});

describe("climaFuerte un dato inválido no corta el resto", () => {
  it.each([
    [
      "U-36 ráfagas Infinity y máxima 40 → calor",
      {
        weather_code: [0, 0],
        wind_gusts_10m_max: JSON.parse("[1e999, 10]"),
        temperature_2m_max: [40, 20],
      },
      "Calor extremo hoy",
    ],
    [
      'U-36 ráfagas "70" y máxima 40 → calor',
      {
        weather_code: [0, 0],
        wind_gusts_10m_max: ["70", 10],
        temperature_2m_max: [40, 20],
      },
      "Calor extremo hoy",
    ],
    [
      'U-36 código "95" y ráfagas 70 → viento',
      { weather_code: ["95", 0], wind_gusts_10m_max: [70, 10] },
      "Viento fuerte hoy",
    ],
    [
      "U-36 código null hoy y 95 mañana → tormenta mañana",
      { weather_code: [null, 95] },
      "Tormenta mañana",
    ],
  ])("%s", (_nombre, daily, titulo) => {
    expect(climaFuerte(daily as never)?.titulo).toBe(titulo);
  });
});

describe("climaFuerte granizo con código de texto", () => {
  it.each([["96"], ["99"]])("U-37 código de texto %j → null", (codigo) => {
    expect(climaFuerte({ weather_code: [codigo, 0] })).toBeNull();
  });
});

describe("climaFuerte un dato inválido hoy no corta mañana", () => {
  it.each([
    [
      "U-38 ráfagas [null, 70] → Viento fuerte mañana",
      { weather_code: [0, 0], wind_gusts_10m_max: [null, 70] },
      "Viento fuerte mañana",
    ],
    [
      "U-38 máxima [null, 40] → Calor extremo mañana",
      { weather_code: [0, 0], temperature_2m_max: [null, 40] },
      "Calor extremo mañana",
    ],
  ])("%s", (_nombre, daily, titulo) => {
    expect(climaFuerte(daily)?.titulo).toBe(titulo);
  });
});

describe("climaFuerte ráfagas con decimales", () => {
  it("U-39 ráfagas 60.5 → Viento fuerte hoy", () => {
    expect(
      climaFuerte({ weather_code: [0, 0], wind_gusts_10m_max: [60.5, 10] })
        ?.titulo,
    ).toBe("Viento fuerte hoy");
  });
});
