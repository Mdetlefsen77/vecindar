import { prisma } from "@/lib/prisma/client";
import { nombreCompleto } from "@/lib/usuarios";
import type { Invitacion } from "./beneficios";

/**
 * Todas las invitaciones con el primer aporte de cada invitado. Son pocas
 * (una por vecino registrado con link), así que se traen enteras y el cálculo
 * de descuentos se hace en memoria con `descuentosDelPeriodo`.
 */
export async function invitacionesConPrimerPago(): Promise<Invitacion[]> {
  const invitados = await prisma.usuario.findMany({
    where: { invitadoPorId: { not: null } },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      invitadoPor: { select: { id: true, nombre: true, apellido: true } },
      pagos: {
        orderBy: { periodo: "asc" },
        take: 1,
        select: { periodo: true },
      },
    },
  });
  return invitados.flatMap((u) =>
    u.invitadoPor
      ? [
          {
            invitadoId: u.id,
            invitadoNombre: nombreCompleto(u),
            invitaId: u.invitadoPor.id,
            invitaNombre: nombreCompleto(u.invitadoPor),
            primerPago: u.pagos[0]?.periodo ?? null,
          },
        ]
      : [],
  );
}
