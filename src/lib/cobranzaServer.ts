import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { finDePeriodo } from "@/lib/cobranza";

/** Cliente Prisma normal o el de una transacción interactiva. */
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Recalcula `vigenteHasta` de la suscripción de un usuario a partir de sus
 * pagos: fin del mes del período más alto pago, o null si no tiene pagos.
 * Crea la fila de suscripción si no existe. Se llama tras registrar o borrar
 * un pago — pasarle el cliente de la transacción (`tx`) para que el pago y la
 * vigencia se escriban de forma atómica.
 */
export async function recalcularVigencia(
  usuarioId: number,
  db: Db = prisma,
): Promise<void> {
  // "YYYY-MM" ordena cronológicamente igual que lexicográficamente, así que el
  // MAX de texto es el período más reciente. Lo calcula la base en un viaje.
  const { _max } = await db.pago.aggregate({
    where: { usuarioId },
    _max: { periodo: true },
  });

  const vigenteHasta = _max.periodo ? finDePeriodo(_max.periodo) : null;

  await db.suscripcion.upsert({
    where: { usuarioId },
    update: { vigenteHasta },
    create: { usuarioId, vigenteHasta },
  });
}
