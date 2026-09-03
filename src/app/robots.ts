import type { MetadataRoute } from "next";

/**
 * Vecindar es una app privada de un barrio: no hay nada público que indexar.
 * Bloqueamos todo el crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
