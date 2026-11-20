import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    incidente: { findUnique: vi.fn() },
    configSLA: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/notificaciones-externas/compartir", () => ({
  obtenerCompartido: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { obtenerCompartido } from "@/lib/notificaciones-externas/compartir";
import DetalleIncidentePage from "@/app/(dashboard)/incidentes/[id]/page";

const BOTON = "Compartir en el grupo";
const AVISO = "Ya se compartió en WhatsApp";

function incidente(estado: string) {
  return {
    id: 7,
    tipo: "ROBO",
    estado,
    prioridad: "CRITICO",
    descripcion: "Se llevaron una bici",
    ubicacionText: null,
    latitud: null,
    longitud: null,
    imagenes: [],
    visibleVecinos: true,
    fechaHora: new Date("2026-11-01T12:00:00Z"),
    reportadoPor: { nombre: "Ana", apellido: "Paz", lote: null },
    lote: null,
  };
}

async function render(estado: string, compartido = false) {
  vi.mocked(prisma.incidente.findUnique).mockResolvedValue(
    incidente(estado) as never,
  );
  vi.mocked(obtenerCompartido).mockResolvedValue(
    compartido
      ? ({
          publicadaPorNombre: "Luis",
          creadaAt: new Date("2026-11-02T12:00:00Z"),
        } as never)
      : null,
  );
  return renderToStaticMarkup(
    await DetalleIncidentePage({ params: Promise.resolve({ id: "7" }) }),
  );
}

describe("/incidentes/[id] · compartir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    } as never);
    vi.mocked(prisma.configSLA.findMany).mockResolvedValue([] as never);
  });

  it("I-143 un incidente RESUELTO no ofrece compartir", async () => {
    const html = await render("RESUELTO");
    expect(html).toContain("Se llevaron una bici");
    expect(html).not.toContain(BOTON);
  });

  it("I-143 un incidente FALSA_ALARMA no ofrece compartir", async () => {
    const html = await render("FALSA_ALARMA");
    expect(html).not.toContain(BOTON);
  });

  it("I-143 un incidente RESUELTO ya compartido no muestra botón ni aviso", async () => {
    const html = await render("RESUELTO", true);
    expect(html).not.toContain(BOTON);
    expect(html).not.toContain(AVISO);
  });

  it("I-143 un incidente ACTIVO ofrece compartir", async () => {
    const html = await render("ACTIVO");
    expect(html).toContain(BOTON);
  });
});
