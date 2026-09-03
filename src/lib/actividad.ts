import { prisma } from "@/lib/prisma/client";

// Throttle en memoria: no escribir `ultimaActividadAt` más de una vez cada
// VENTANA_MS por usuario. Así el seguimiento de actividad no agrega una
// escritura a la base en cada request.
//
// En serverless cada instancia tiene su propio Map, así que en el peor caso
// hay una escritura por instancia por ventana por usuario activo — igual es
// despreciable (un UPDATE cada ~10 min).
const VENTANA_MS = 10 * 60 * 1000;
const ultimaEscritura = new Map<number, number>();

/**
 * Marca al usuario como activo "ahora" (con throttle). Fire-and-forget: nunca
 * bloquea ni puede romper el request que la dispara. Se llama desde los guards
 * de API (`requireSession` / `requireRoleSession`) y desde el layout del
 * dashboard, que son los puntos por los que pasa toda request autenticada.
 */
export function registrarActividad(usuarioId: number): void {
  if (!Number.isFinite(usuarioId)) return;

  const ahora = Date.now();
  const previo = ultimaEscritura.get(usuarioId) ?? 0;
  if (ahora - previo < VENTANA_MS) return;
  ultimaEscritura.set(usuarioId, ahora);

  void prisma.usuario
    .update({
      where: { id: usuarioId },
      data: { ultimaActividadAt: new Date() },
    })
    .catch(() => {
      // best-effort: si falla, permitir el reintento en la próxima request.
      ultimaEscritura.delete(usuarioId);
    });
}
