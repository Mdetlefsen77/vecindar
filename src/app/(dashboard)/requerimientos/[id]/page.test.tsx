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
    requerimiento: { findUnique: vi.fn() },
    configSLA: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/notificaciones-externas/compartir", () => ({
  obtenerCompartido: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { obtenerCompartido } from "@/lib/notificaciones-externas/compartir";
import DetallePedidoPage from "@/app/(dashboard)/requerimientos/[id]/page";

const BOTON = "Compartir en el grupo";
const AVISO = "Ya se compartió en WhatsApp";

function pedido(estado: string) {
  return {
    id: 9,
    titulo: "Poda de árbol",
    descripcion: "Hay que podar el árbol de la esquina",
    categoria: "OTRO",
    estado,
    prioridad: "CRITICO",
    imagenes: [],
    createdAt: new Date("2026-11-01T12:00:00Z"),
    usuario: { id: "u2", nombre: "Ana", apellido: "Paz", lote: null },
    comentarios: [],
  };
}

async function render(estado: string, compartido = false) {
  vi.mocked(prisma.requerimiento.findUnique).mockResolvedValue(
    pedido(estado) as never,
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
    await DetallePedidoPage({ params: Promise.resolve({ id: "9" }) }),
  );
}

describe("/requerimientos/[id] · compartir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    } as never);
    vi.mocked(prisma.configSLA.findMany).mockResolvedValue([] as never);
  });

  it("I-144 un pedido CERRADO no ofrece compartir", async () => {
    const html = await render("CERRADO");
    expect(html).toContain("Hay que podar el árbol de la esquina");
    expect(html).not.toContain(BOTON);
  });

  it("I-144 un pedido RESUELTO no ofrece compartir", async () => {
    const html = await render("RESUELTO");
    expect(html).not.toContain(BOTON);
  });

  it("I-144 un pedido CERRADO ya compartido no muestra botón ni aviso", async () => {
    const html = await render("CERRADO", true);
    expect(html).not.toContain(BOTON);
    expect(html).not.toContain(AVISO);
  });

  it("I-144 un pedido NUEVO ofrece compartir", async () => {
    const html = await render("NUEVO");
    expect(html).toContain(BOTON);
  });
});
