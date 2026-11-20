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
    mascotaPerdida: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/notificaciones-externas/compartir", () => ({
  obtenerCompartido: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { obtenerCompartido } from "@/lib/notificaciones-externas/compartir";
import DetalleMascotaPage from "@/app/(dashboard)/mascotas/[id]/page";

const BOTON = "Compartir en el grupo";
const AVISO = "Ya se compartió en WhatsApp";

function mascota(estado: boolean) {
  return {
    id: 5,
    tipo: "PERDIDA",
    estado,
    nombre: "Firulais",
    descripcion: "Perro marrón con collar rojo",
    zona: "Cerca de la plaza",
    contacto: "11 5555 0000",
    foto: null,
    resueltaAt: null,
    createdAt: new Date("2026-11-01T12:00:00Z"),
    usuario: {
      id: "u2",
      nombre: "Ana",
      apellido: "Paz",
      telefono: null,
      lote: { numero: 3, manzana: { numero: 2 } },
    },
  };
}

async function render(estado: boolean, compartido = false) {
  vi.mocked(prisma.mascotaPerdida.findUnique).mockResolvedValue(
    mascota(estado) as never,
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
    await DetalleMascotaPage({ params: Promise.resolve({ id: "5" }) }),
  );
}

describe("/mascotas/[id] · compartir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    } as never);
  });

  it("I-145 una mascota resuelta no ofrece compartir", async () => {
    const html = await render(false);
    expect(html).toContain("Perro marrón con collar rojo");
    expect(html).not.toContain(BOTON);
  });

  it("I-145 una mascota resuelta ya compartida no muestra botón ni aviso", async () => {
    const html = await render(false, true);
    expect(html).not.toContain(BOTON);
    expect(html).not.toContain(AVISO);
  });

  it("I-145 una mascota abierta ofrece compartir", async () => {
    const html = await render(true);
    expect(html).toContain(BOTON);
  });
});
