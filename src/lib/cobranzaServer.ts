import { prisma } from "@/lib/prisma/client";
import { finDePeriodo } from "@/lib/cobranza";

/**
 * Recalcula `vigenteHasta` de la suscripción de un usuario a partir de sus
 * pagos: fin del mes del período más alto pago, o null si no tiene pagos.
 * Crea la fila de suscripción si no existe. Se llama tras registrar o borrar
 * un pago.
 */
export async function recalcularVigencia(usuarioId: number): Promise<void> {
  const pagos = await prisma.pago.findMany({
    where: { usuarioId },
    select: { periodo: true },
  });

  // "YYYY-MM" ordena cronológicamente igual que lexicográficamente.
  const periodoMax = pagos
    .map((p) => p.periodo)
    .sort()
    .at(-1);

  const vigenteHasta = periodoMax ? finDePeriodo(periodoMax) : null;

  await prisma.suscripcion.upsert({
    where: { usuarioId },
    update: { vigenteHasta },
    create: { usuarioId, vigenteHasta },
  });
}
