import { prisma } from "@/lib/prisma/client";
import { enviarPushUsuario } from "@/lib/push/enviarPush";

/**
 * Recibo de valor mensual (docs/proposal-crecimiento.md §2) — cada `Pago`
 * dispara un push corto con 1-2 números del período que cubre, para que el
 * vecino vea en qué se usó su plata, no solo que se le cobró.
 *
 * VERSIÓN MÍNIMA — DEUDA TÉCNICA INTENCIONAL: el diseño original saca estos
 * números del `ReporteModelo` (docs/proposal-reportes.md), que todavía no
 * existe en código (ese módulo completo sigue sin implementar). Mientras
 * tanto, este archivo calcula un puñado de métricas simples y ya confirmadas
 * como 100% calculables hoy (auditoría de proposal-reportes.md §2, sin
 * dependencia de la Fase 0 de esa propuesta) directamente contra la base.
 *
 * Cuando exista `ReporteModelo`, reemplazar `numerosDelPeriodo()` por una
 * llamada a ese motor — es el único punto de este archivo que debería
 * cambiar, para no terminar con dos motores de cálculo que puedan divergir
 * (riesgo que la propia proposal-reportes.md marca en su §14).
 *
 * También simplificado a propósito: límites de mes con offset fijo -03:00
 * (Córdoba no tiene horario de verano desde 2009), en vez del módulo
 * `periodo.ts` con `date-fns-tz` que diseña proposal-reportes.md §6. Para un
 * push de reconocimiento, no para un documento auditable, es suficiente.
 */

const MINIMO_CASOS_MEDIANA = 3;

function limitesMes(periodo: string): { inicio: Date; fin: Date } {
  const [anio, mes] = periodo.split("-").map(Number);
  const inicio = new Date(Date.UTC(anio, mes - 1, 1, 3, 0, 0));
  const fin = new Date(Date.UTC(anio, mes, 1, 3, 0, 0));
  return { inicio, fin };
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 !== 0
    ? ordenados[mitad]!
    : (ordenados[mitad - 1]! + ordenados[mitad]!) / 2;
}

function mesLabel(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, 1)).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function numerosDelPeriodo(periodo: string): Promise<string[]> {
  const { inicio, fin } = limitesMes(periodo);
  const rango = { gte: inicio, lt: fin };

  const [incidentesResueltos, requerimientosIngresados, mascotasResueltas, alertas] =
    await Promise.all([
      prisma.incidente.count({
        where: { createdAt: rango, estado: "RESUELTO" },
      }),
      prisma.requerimiento.count({ where: { createdAt: rango } }),
      prisma.mascotaPerdida.count({ where: { resueltaAt: rango } }),
      prisma.alertaPanico.findMany({
        where: { createdAt: rango, recibidoAt: { not: null } },
        select: { createdAt: true, recibidoAt: true },
      }),
    ]);

  const frases: string[] = [];

  if (alertas.length >= MINIMO_CASOS_MEDIANA) {
    const minutos = alertas.map(
      (a) => (a.recibidoAt!.getTime() - a.createdAt.getTime()) / 60_000,
    );
    frases.push(
      `el barrio respondió en ${Math.round(mediana(minutos))} min promedio a una alerta SOS`,
    );
  }
  if (incidentesResueltos > 0) {
    frases.push(
      `se resolvieron ${incidentesResueltos} incidente${incidentesResueltos === 1 ? "" : "s"}`,
    );
  }
  if (mascotasResueltas > 0) {
    frases.push(
      `${mascotasResueltas} mascota${mascotasResueltas === 1 ? "" : "s"} volvió${mascotasResueltas === 1 ? "" : "ron"} a casa`,
    );
  }
  if (requerimientosIngresados > 0) {
    frases.push(
      `se atendieron ${requerimientosIngresados} reclamo${requerimientosIngresados === 1 ? "" : "s"} de mantenimiento`,
    );
  }

  return frases;
}

/**
 * Dispara el recibo de valor para un `Pago` recién registrado. Best-effort:
 * nunca debe hacer fallar el registro del pago en sí — se llama con `void`
 * desde los route handlers, igual que el resto de los push del proyecto.
 */
export async function enviarReciboDeValor(pago: {
  usuarioId: number;
  periodo: string;
}): Promise<void> {
  try {
    const frases = await numerosDelPeriodo(pago.periodo);
    const cuerpo =
      frases.length > 0
        ? `Gracias a tu cuota, ${frases.slice(0, 2).join(" y ")}.`
        : "Gracias por sostener la seguridad y gestión del barrio este mes.";

    await enviarPushUsuario(pago.usuarioId, {
      title: `Tu cuota de ${mesLabel(pago.periodo)}`,
      body: cuerpo,
      url: "/mi-suscripcion",
      tag: `recibo-valor-${pago.usuarioId}-${pago.periodo}`,
    });
  } catch (err) {
    console.error("Error enviando recibo de valor:", err);
  }
}
