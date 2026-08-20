"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * El panel de admin/seguridad es un server component — se queda desactualizado
 * si el vecino responde un mensaje o se activa una alerta nueva mientras la
 * página está abierta. Este componente la refresca sola cada 5s (mismo
 * intervalo que usa BotonSOS del lado del vecino).
 */
export default function PanicoAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
