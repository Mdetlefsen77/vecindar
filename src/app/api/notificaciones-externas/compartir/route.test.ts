import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/guard", () => ({
  requireRoleSession: vi.fn(),
  getUserId: vi.fn(() => 7),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    aviso: { findFirst: vi.fn() },
    incidente: { findUnique: vi.fn() },
    requerimiento: { findUnique: vi.fn() },
    mascotaPerdida: { findUnique: vi.fn() },
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

  it("I-136 un incidente RESUELTO no se comparte: 409 y no se registra la publicación", async () => {
    vi.mocked(prisma.incidente.findUnique).mockResolvedValue({
      id: 5,
      visibleVecinos: true,
      estado: "RESUELTO",
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
          body: JSON.stringify({ tipoEvento: "INCIDENTE", entidadId: 5 }),
        },
      ),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Este incidente ya está cerrado y no se comparte.",
    });
    expect(compartirEvento).not.toHaveBeenCalled();
  });

  it("I-137 un incidente FALSA_ALARMA no se comparte: 409", async () => {
    vi.mocked(prisma.incidente.findUnique).mockResolvedValue({
      id: 5,
      visibleVecinos: true,
      estado: "FALSA_ALARMA",
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
          body: JSON.stringify({ tipoEvento: "INCIDENTE", entidadId: 5 }),
        },
      ),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Este incidente ya está cerrado y no se comparte.",
    });
    expect(compartirEvento).not.toHaveBeenCalled();
  });
});

describe("POST /api/notificaciones-externas/compartir con un pedido", () => {
  it("I-129 la descripción sale cortada a las 5 primeras palabras y no el título", async () => {
    vi.mocked(prisma.requerimiento.findUnique).mockResolvedValue({
      id: 4,
      categoria: "ILUMINACION",
      titulo: "Reclamo urgente",
      descripcion: "Hay un poste de luz caído sobre la calle 5",
      usuario: {
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
          body: JSON.stringify({ tipoEvento: "REQUERIMIENTO", entidadId: 4 }),
        },
      ),
    );
    const { mensaje } = await res.json();

    expect(mensaje).toContain("Hay un poste de luz…");
    expect(mensaje).not.toContain("caído");
    expect(mensaje).not.toContain("Reclamo urgente");
  });

  it("I-138 un pedido RESUELTO no se comparte: 409 y no se registra la publicación", async () => {
    vi.mocked(prisma.requerimiento.findUnique).mockResolvedValue({
      id: 4,
      categoria: "ILUMINACION",
      estado: "RESUELTO",
      descripcion: "Hay un poste de luz caído sobre la calle 5",
      usuario: {
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
          body: JSON.stringify({ tipoEvento: "REQUERIMIENTO", entidadId: 4 }),
        },
      ),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Este pedido ya está cerrado y no se comparte.",
    });
    expect(compartirEvento).not.toHaveBeenCalled();
  });

  it("I-139 un pedido CERRADO no se comparte: 409 y no se registra la publicación", async () => {
    vi.mocked(prisma.requerimiento.findUnique).mockResolvedValue({
      id: 4,
      categoria: "ILUMINACION",
      estado: "CERRADO",
      descripcion: "Hay un poste de luz caído sobre la calle 5",
      usuario: {
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
          body: JSON.stringify({ tipoEvento: "REQUERIMIENTO", entidadId: 4 }),
        },
      ),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Este pedido ya está cerrado y no se comparte.",
    });
    expect(compartirEvento).not.toHaveBeenCalled();
  });

  it("I-142 un pedido EN_PROGRESO se comparte: 200 con el mensaje", async () => {
    vi.mocked(prisma.requerimiento.findUnique).mockResolvedValue({
      id: 4,
      categoria: "ILUMINACION",
      estado: "EN_PROGRESO",
      descripcion: "Hay un poste de luz caído sobre la calle 5",
      usuario: {
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
          body: JSON.stringify({ tipoEvento: "REQUERIMIENTO", entidadId: 4 }),
        },
      ),
    );
    const { mensaje } = await res.json();

    expect(res.status).toBe(200);
    expect(mensaje).toContain("Hay un poste de luz…");
  });
});

describe("POST /api/notificaciones-externas/compartir con una mascota", () => {
  it("I-130 la descripción sale cortada a las 5 primeras palabras y nada más de la mascota", async () => {
    vi.mocked(prisma.mascotaPerdida.findUnique).mockResolvedValue({
      id: 9,
      tipo: "PERDIDA",
      estado: true,
      nombre: "Toby",
      zona: "Plaza central",
      contacto: "351 555 1234",
      foto: "https://fotos.test/toby.jpg",
      descripcion: "Perro marrón con collar rojo, muy asustado",
      usuario: {
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
          body: JSON.stringify({ tipoEvento: "MASCOTA", entidadId: 9 }),
        },
      ),
    );
    const { mensaje } = await res.json();

    expect(mensaje).toContain("Perro marrón con collar rojo,…");
    expect(mensaje).not.toContain("asustado");
    expect(mensaje).not.toContain("Toby");
    expect(mensaje).not.toContain("Plaza central");
    expect(mensaje).not.toContain("351 555 1234");
    expect(mensaje).not.toContain("fotos.test");
  });

  it("I-140 una mascota resuelta no se comparte (409)", async () => {
    vi.mocked(prisma.mascotaPerdida.findUnique).mockResolvedValue({
      id: 9,
      tipo: "PERDIDA",
      estado: false,
      descripcion: "Perro marrón con collar rojo",
      usuario: {
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
          body: JSON.stringify({ tipoEvento: "MASCOTA", entidadId: 9 }),
        },
      ),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Esta mascota ya está resuelta y no se comparte.",
    });
    expect(compartirEvento).not.toHaveBeenCalled();
  });
});
