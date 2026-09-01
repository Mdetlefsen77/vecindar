/**
 * Rate limiter en memoria, best-effort.
 *
 * En entornos serverless con varias instancias el límite es *por instancia*, no
 * global — pero alcanza como primera barrera anti-abuso para endpoints públicos
 * (ej: registro). Para límites estrictos habría que mover el contador a Redis o
 * a la base.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpieza oportunista para que el Map no crezca sin control en procesos largos.
function limpiarVencidos(now: number): void {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Registra un intento para `key`. Devuelve `true` si está dentro del límite,
 * `false` si lo superó dentro de la ventana actual.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  limpiarVencidos(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** IP del cliente a partir de las cabeceras del proxy (Vercel / reverse proxy). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
