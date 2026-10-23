// Beneficio por invitar vecinos. Sin imports de servidor: lo usan Inicio, Mi
// suscripción y el panel de cobranza.
//
// Reglas (definidas por la comisión, 2026-10):
//  - Quien invita: $10.000 menos de aporte por cada vecino invitado que paga
//    su primer aporte, durante los 2 meses siguientes a ese pago.
//  - El vecino invitado: $5.000 menos en sus 2 primeros aportes.
//  - Se aplican sobre el aporte total y se acumulan (nunca bajan de $0).
// Por ahora los descuenta tesorería a mano al cobrar: la app solo calcula a
// quién y cuánto (ver panel de cobranza).

export const DESCUENTO_POR_INVITADO = 10_000;
export const DESCUENTO_VECINO_INVITADO = 5_000;
export const MESES_DESCUENTO = 2;

/** "2026-11" + 2 → "2027-01". */
export function sumarMeses(periodo: string, n: number): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const d = new Date(anio, mes - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Un vecino que se registró con el link de otro. */
export interface Invitacion {
  invitadoId: number;
  invitadoNombre: string;
  invitaId: number;
  invitaNombre: string;
  /** Período ("YYYY-MM") de su primer aporte. null = todavía no pagó. */
  primerPago: string | null;
}

export interface Descuento {
  usuarioId: number;
  monto: number;
  motivo: string;
}

/**
 * Descuentos que corresponden en `periodo`. `periodoHoy` sirve para el
 * invitado que todavía no pagó: su descuento va en el aporte que está por
 * pagar (el de este mes).
 */
export function descuentosDelPeriodo(
  invitaciones: Invitacion[],
  periodo: string,
  periodoHoy: string,
): Descuento[] {
  const descuentos: Descuento[] = [];
  for (const inv of invitaciones) {
    // El vecino invitado: sus 2 primeros aportes.
    if (inv.primerPago === null) {
      if (periodo === periodoHoy) {
        descuentos.push({
          usuarioId: inv.invitadoId,
          monto: DESCUENTO_VECINO_INVITADO,
          motivo: `Vecino nuevo, invitado por ${inv.invitaNombre} (primer aporte)`,
        });
      }
    } else {
      const n = mesesEntre(inv.primerPago, periodo);
      if (n >= 0 && n < MESES_DESCUENTO) {
        descuentos.push({
          usuarioId: inv.invitadoId,
          monto: DESCUENTO_VECINO_INVITADO,
          motivo: `Vecino nuevo, invitado por ${inv.invitaNombre} (aporte ${n + 1} de ${MESES_DESCUENTO})`,
        });
      }
      // Quien invitó: los 2 meses siguientes al primer aporte del invitado.
      if (n >= 1 && n <= MESES_DESCUENTO) {
        descuentos.push({
          usuarioId: inv.invitaId,
          monto: DESCUENTO_POR_INVITADO,
          motivo: `Invitó a ${inv.invitadoNombre} (mes ${n} de ${MESES_DESCUENTO})`,
        });
      }
    }
  }
  return descuentos;
}

/** Descuentos sumados por vecino, sin pasarse del aporte. */
export function totalPorUsuario(
  descuentos: Descuento[],
): Map<number, { monto: number; motivos: string[] }> {
  const total = new Map<number, { monto: number; motivos: string[] }>();
  for (const d of descuentos) {
    const t = total.get(d.usuarioId) ?? { monto: 0, motivos: [] };
    t.monto += d.monto;
    t.motivos.push(d.motivo);
    total.set(d.usuarioId, t);
  }
  return total;
}

function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1] = desde.split("-").map(Number);
  const [a2, m2] = hasta.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}
