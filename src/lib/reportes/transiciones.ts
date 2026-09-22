import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import type { EntidadTransicion } from "@/generated/enums";

/** Cliente Prisma normal o el de una transacción interactiva. */
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Registra un cambio de estado — Fase 0 de docs/proposal-reportes.md (R8).
 * Pasarle el cliente de la transacción (`tx`) para que el `update` de la
 * entidad y esta fila se escriban de forma atómica, igual que
 * `recalcularVigencia` en cobranzaServer.ts.
 *
 * No hace nada si `estadoAnterior === estadoNuevo` — evita ruido en el
 * historial cuando un PATCH toca otros campos (prioridad, visibilidad) sin
 * cambiar el estado.
 */
export async function registrarTransicion(
  params: {
    entidadTipo: EntidadTransicion;
    entidadId: number;
    estadoAnterior: string;
    estadoNuevo: string;
    usuarioId: number;
  },
  db: Db = prisma,
): Promise<void> {
  if (params.estadoAnterior === params.estadoNuevo) return;
  await db.transicionEstado.create({ data: params });
}
