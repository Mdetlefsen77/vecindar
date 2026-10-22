import { prisma } from "@/lib/prisma/client";
import { estadoCobranza, type EstadoCobranza } from "@/lib/cobranza";
import { puedeCargarPromo } from "@/lib/oficios";

/** Filtro de promo vigente: la vencida no se muestra aunque el cron no la haya borrado. */
export function promoVigente(ahora = new Date()) {
  return { venceAt: { gt: ahora } };
}

/** Si el vecino puede cargar promos según su aporte (ver `puedeCargarPromo`). */
export async function habilitacionPromo(
  usuarioId: number,
  ahora = new Date(),
): Promise<{ puede: boolean; estado: EstadoCobranza }> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      createdAt: true,
      suscripcion: { select: { vigenteHasta: true, exento: true } },
    },
  });
  if (!usuario) return { puede: false, estado: "sin_datos" };
  const estado = estadoCobranza(usuario.suscripcion, ahora);
  return { puede: puedeCargarPromo(estado, usuario.createdAt, ahora), estado };
}
