import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { respuestasPorRonda } = vi.hoisted(() => ({
  respuestasPorRonda: new Set<string>(),
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
        findFirst: vi.fn(async ({ where }: { where: { ronda: string } }) =>
          respuestasPorRonda.has(where.ronda) ? { id: 1 } : null,
        ),
      },
    },
  };
});

import InicioPage from "@/app/(dashboard)/inicio/page";

const TEXTO = "¿Nos contás cómo te va con la app?";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T15:00:00Z"));
  respuestasPorRonda.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("/inicio · tarjeta de la encuesta", () => {
  it("I-154 se ve si no respondió la ronda actual y no si ya la respondió", async () => {
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);

    respuestasPorRonda.add("2026-T4");
    expect(renderToStaticMarkup(await InicioPage())).not.toContain(TEXTO);

    respuestasPorRonda.clear();
    respuestasPorRonda.add("2026-T3");
    expect(renderToStaticMarkup(await InicioPage())).toContain(TEXTO);
  });
});
