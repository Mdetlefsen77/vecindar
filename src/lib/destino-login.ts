const POR_DEFECTO = "/inicio";

export function destinoSeguro(
  callbackUrl: string | null,
  origen: string,
): string {
  if (!callbackUrl) return POR_DEFECTO;
  try {
    const url = new URL(callbackUrl, origen);
    if (url.origin !== origen) return POR_DEFECTO;
    if (url.pathname.startsWith("//")) return POR_DEFECTO;
    return url.pathname + url.search + url.hash;
  } catch {
    return POR_DEFECTO;
  }
}

export function hrefConDestino(
  base: string,
  callbackUrl: string | null,
  origen: string,
): string {
  const destino = origen ? destinoSeguro(callbackUrl, origen) : POR_DEFECTO;
  return destino !== POR_DEFECTO
    ? `${base}?callbackUrl=${encodeURIComponent(destino)}`
    : base;
}
