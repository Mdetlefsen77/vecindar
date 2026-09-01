import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Solo se permiten imágenes desde Supabase Storage (donde `/api/uploads`
    // sube las fotos). Antes estaba abierto a cualquier host HTTPS (`**`).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
