import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/guard", () => ({
  requireRoleSession: vi.fn(),
  getUserId: vi.fn(() => 7),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    aviso: { findFirst: vi.fn() },
    incidente: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/notificaciones-externas/compartir", () => ({
  compartirEvento: vi.fn(),
}));

import { NextRequest } from "next/server";
import { requireRoleSession } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma/client";
import { compartirEvento } from "@/lib/notificaciones-externas/compartir";
import { POST } from "@/app/api/notificaciones-externas/compartir/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRoleSession).mockResolvedValue({
    session: { user: { id: "7", role: "VECINO" } },
  } as never);
  vi.mocked(compartirEvento).mockResolvedValue({
    ok: true,
    codigo: "abc123",
  } as never);
});

describe("POST /api/notificaciones-externas/compartir con un aviso", () => {
  it("I-126 un detalle largo sale cortado a las 5 primeras palabras", async () => {
    vi.mocked(prisma.aviso.findFirst).mockResolvedValue({
      id: 1,
      tipo: "CORTE_LUZ",
      ubicacion: "calle K esq. 3",
      detalle: "Se cortó la luz en toda la manzana 4",
      venceAt: new Date(Date.now() + 6 * 3600 * 1000),
      autor: {
        nombre: "Ana",
        apellido: "Pérez",
        ocultarNombreEnPublicacionExterna: false,
      },
    } as never);

    const res = await POST(
      new NextRequest(
        "http://localhost/api/notificaciones-externas/compartir",
        {
          method: "POST",
          body: JSON.stringify({ tipoEvento: "AVISO", entidadId: 1 }),
        },
      ),
    );
    const { mensaje } = await res.json();

    expect(mensaje).toContain("Se cortó la luz en…");
    expect(mensaje).not.toContain("toda");
  });
});

describe("POST /api/notificaciones-externas/compartir con un incidente", () => {
  it("I-127 la descripción sale cortada a las 5 primeras palabras", async () => {
    vi.mocked(prisma.incidente.findUnique).mockResolvedValue({
      id: 3,
      visibleVecinos: true,
      descripcion: "Dos sujetos merodeando por la plaza del lote 12",
      reportadoPor: {
        nombre: "Ana",
        apellido: "Pérez",
        ocultarNombreEnPublicacionExterna: false,
      },
    } as never);

    const res = await POST(
      new NextRequest(
        "http://localhost/api/notificaciones-externas/compartir",
        {
          method: "POST",
          body: JSON.stringify({ tipoEvento: "INCIDENTE", entidadId: 3 }),
        },
      ),
    );
    const { mensaje } = await res.json();

    expect(mensaje).toContain("Dos sujetos merodeando por la…");
    expect(mensaje).not.toContain("plaza");
  });

  it("I-128 un incidente no visible para vecinos no se comparte", async () => {
    vi.mocked(prisma.incidente.findUnique).mockResolvedValue({
      id: 4,
      visibleVecinos: false,
      descripcion: "Robo en la casa del lote 9",
      reportadoPor: {
        nombre: "Ana",
        apellido: "Pérez",
        ocultarNombreEnPublicacionExterna: false,
      },
    } as never);

    const res = await POST(
      new NextRequest(
        "http://localhost/api/notificaciones-externas/compartir",
        {
          method: "POST",
          body: JSON.stringify({ tipoEvento: "INCIDENTE", entidadId: 4 }),
        },
      ),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Este incidente no está visible para vecinos.",
    });
    expect(compartirEvento).not.toHaveBeenCalled();
  });
});
