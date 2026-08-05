import { prisma } from "@/lib/prisma/client";
import type { SeccionInicio } from "@/generated/enums";

/**
 * Marca una sección como vista por el usuario (ahora). Usado por las páginas
 * de listado para resetear el badge de "nuevo" en las tarjetas de /inicio.
 */
export async function marcarSeccionVista(
  usuarioId: number,
  seccion: SeccionInicio,
): Promise<void> {
  await prisma.vistaSeccion.upsert({
    where: { usuarioId_seccion: { usuarioId, seccion } },
    update: { vistoAt: new Date() },
    create: { usuarioId, seccion },
  });
}
