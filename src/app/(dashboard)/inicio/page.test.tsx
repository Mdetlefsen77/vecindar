import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { respuestas } = vi.hoisted(() => ({
  respuestas: new Set<string>(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "7", name: "Ana Vecina", role: "VECINO" },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/components/clima/TarjetaClima", () => ({
  TarjetaClima: () => null,
}));
vi.mock("@/components/crecimiento/InvitarVecino", () => ({
  default: () => null,
}));
vi.mock("@/lib/crecimiento/invitaciones", () => ({
  obtenerOCrearCodigo: vi.fn().mockResolvedValue("ABC123"),
}));
vi.mock("@/lib/crecimiento/beneficiosServer", () => ({
  invitacionesConPrimerPago: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/prisma/client", () => {
  const lista = () => ({
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  });
  return {
    prisma: {
      usuario: lista(),
      incidente: lista(),
      requerimiento: lista(),
      mascotaPerdida: lista(),
      parteTurno: lista(),
      oficio: lista(),
      promoOficio: lista(),
      aviso: lista(),
      alertaPanico: lista(),
      respuestaEncuesta: {
        findFirst: vi.fn(
          async ({
            where,
          }: {
            where: { usuarioId?: number; ronda?: string };
          }) =>
            [...respuestas].some((clave) => {
              const [usuarioId, ronda] = clave.split(":");
              return (
                (where.usuarioId === undefined ||
                  String(where.usuarioId) === usuarioId) &&
                (where.ronda === undefined || where.ronda === ronda)
              );
            })
              ? { id: 1 }
              : null,
        ),
      },
    },
  };
});

import InicioPage from "@/app/(dashboard)/inicio/page";
import { prisma } from "@/lib/prisma/client";

const TEXTO = "¿Nos contás cómo te va con la app?";
const DIA = 24 * 3_600_000;

function cuentaCreada(
  createdAt: Date,
  encuestaPospuestaEn: Date | null = null,
) {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
    createdAt,
    encuestaPospuestaEn,
    vistasSecciones: [],
    suscripcion: null,
  } as never);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T15:00:00Z"));
  respuestas.clear();
  cuentaCreada(new Date(Date.now() - 365 * DIA));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("/inicio · tarjeta de la encuesta", () => {
  it("I-154 se ve si no respondió la ronda actual y no si ya la respondió", async () => {
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);

    respuestas.add("7:2026-T4");
    expect(renderToStaticMarkup(await InicioPage())).not.toContain(TEXTO);

    respuestas.clear();
    respuestas.add("7:2026-T3");
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });

  it("I-158 se ve si respondió otro vecino y no el de la sesión", async () => {
    respuestas.add("8:2026-T4");
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });

  it("I-169 no se ve si la cuenta tiene 14 días menos 1 ms", async () => {
    cuentaCreada(new Date(Date.now() - 14 * DIA + 1));
    expect(renderToStaticMarkup(await InicioPage())).not.toContain(TEXTO);
  });

  it("I-170 se ve si la cuenta tiene 14 días justos", async () => {
    cuentaCreada(new Date(Date.now() - 14 * DIA));
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });

  it("I-176 no se ve si se pospuso hace 7 días menos 1 ms", async () => {
    cuentaCreada(
      new Date(Date.now() - 365 * DIA),
      new Date(Date.now() - 7 * DIA + 1),
    );
    expect(renderToStaticMarkup(await InicioPage())).not.toContain(TEXTO);
  });

  it("I-177 se ve si se pospuso hace 7 días justos", async () => {
    cuentaCreada(
      new Date(Date.now() - 365 * DIA),
      new Date(Date.now() - 7 * DIA),
    );
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });

  it("I-178 pospuesta en una ronda, no se ve a los 4 días y sí a los 7 al cambiar de ronda", async () => {
    cuentaCreada(
      new Date("2026-01-01T12:00:00-03:00"),
      new Date("2026-12-28T12:00:00-03:00"),
    );
    vi.setSystemTime(new Date("2027-01-01T12:00:00-03:00"));
    expect(renderToStaticMarkup(await InicioPage())).not.toContain(TEXTO);

    vi.setSystemTime(new Date("2027-01-04T13:00:00-03:00"));
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });

  it("I-179 se ve si la única respuesta es de otra ronda", async () => {
    respuestas.add("7:2026-T3");
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });

  it("I-180 no se ve si el usuario de la sesión ya no existe", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);
    expect(renderToStaticMarkup(await InicioPage())).not.toContain(TEXTO);
  });
});
