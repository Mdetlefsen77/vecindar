import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/generated/client";
import { finDePeriodo, formatoPesos, montoDeSuscripcion } from "@/lib/cobranza";
import { enviarPushUsuario } from "@/lib/push/enviarPush";

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

  // Con al menos un pago, la cuenta deja de estar en prueba (src/lib/prueba.ts).
  // Borrar el pago después no la devuelve a prueba: eso lo decide un admin.
  if (vigenteHasta) {
    await db.usuario.updateMany({
      where: { id: usuarioId, pruebaHasta: { not: null } },
      data: { pruebaHasta: null },
    });
  }
}

/**
 * Vecinos a los que corresponde recordarles el pago: verificados, no exentos,
 * con la cuota vencida o sin ningún pago registrado ("sin datos" — incluye a
 * los que no tienen fila de `Suscripcion`). `conPush` = tiene al menos un
 * dispositivo suscripto a notificaciones.
 */
export async function deudoresParaRecordar(ahora = new Date()) {
  const usuarios = await prisma.usuario.findMany({
    where: {
      verificado: true,
      OR: [
        { suscripcion: null },
        {
          suscripcion: {
            exento: false,
            OR: [{ vigenteHasta: null }, { vigenteHasta: { lt: ahora } }],
          },
        },
      ],
    },
    select: {
      id: true,
      suscripcion: { select: { vigenteHasta: true, montoMensual: true } },
      _count: { select: { pushSubscriptions: true } },
    },
  });

  return usuarios.map((u) => ({
    usuarioId: u.id,
    vigenteHasta: u.suscripcion?.vigenteHasta ?? null,
    estado: (u.suscripcion?.vigenteHasta ? "vencida" : "sin_datos") as
      | "vencida"
      | "sin_datos",
    cuota: montoDeSuscripcion(u.suscripcion),
    conPush: u._count.pushSubscriptions > 0,
  }));
}

/** Push de recordatorio de pago, con texto según el estado del vecino. */
export async function enviarPushRecordatorio(
  usuarioId: number,
  estado: "vencida" | "sin_datos",
  cuota: number,
): Promise<void> {
  const monto = formatoPesos(cuota);
  await enviarPushUsuario(
    usuarioId,
    estado === "vencida"
      ? {
          title: "Tu aporte mensual venció",
          body: `Aporte mensual: ${monto}. Entrá a "Mi suscripción" para ver cómo pagar.`,
          url: "/mi-suscripcion",
          tag: "cobranza",
        }
      : {
          title: "Activá tu suscripción a Vecindar",
          body: `Todavía no registramos ningún aporte. Aporte mensual: ${monto}. Entrá a "Mi suscripción" para ver cómo pagar.`,
          url: "/mi-suscripcion",
          tag: "cobranza",
        },
  );
}
