"use client";

import { useEffect, useRef, useState } from "react";

type Estado =
  | { tipo: "inicial" }
  | { tipo: "cargando" }
  | { tipo: "listo"; mensaje: string } // hay que tocar de nuevo (el navegador pidió un gesto nuevo)
  | { tipo: "compartido" }
  | { tipo: "error"; mensaje: string };

/** Descarga las fotos del parte como `File` para adjuntarlas al share nativo. */
async function descargarFotos(urls: string[]): Promise<File[]> {
  const archivos = await Promise.all(
    urls.map(async (url, i) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("foto");
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] ?? "jpg";
      return new File([blob], `parte-${i + 1}.${ext}`, { type: blob.type });
    }),
  );
  return archivos;
}

/**
 * "Compartir en el grupo" para un parte de turno. Con Web Share (celular)
 * manda el texto y las fotos juntas — WhatsApp las publica con el texto como
 * epígrafe. Sin soporte de archivos, comparte solo el texto (el link del
 * mensaje lleva a las fotos en la app).
 */
export default function CompartirParte({
  parteId,
  imagenes,
}: {
  parteId: number;
  imagenes: string[];
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });
  const [copiado, setCopiado] = useState(false);
  const fotos = useRef<File[] | null>(null);

  // Las fotos se bajan apenas carga la página: si se bajan recién al tocar
  // el botón, el navegador puede dar por vencido el gesto del usuario y
  // rechazar el share.
  useEffect(() => {
    if (imagenes.length === 0 || typeof navigator.canShare !== "function") return;
    let cancelado = false;
    descargarFotos(imagenes)
      .then((archivos) => {
        if (!cancelado && navigator.canShare({ files: archivos })) {
          fotos.current = archivos;
        }
      })
      .catch(() => {
        // Sin fotos adjuntas: se comparte solo el texto con el link.
      });
    return () => {
      cancelado = true;
    };
  }, [imagenes]);

  async function compartirNativo(mensaje: string) {
    const conFotos = fotos.current?.length
      ? { files: fotos.current, text: mensaje }
      : null;
    try {
      await navigator.share(conFotos ?? { text: mensaje });
      setEstado({ tipo: "compartido" });
    } catch (err) {
      const nombre = err instanceof Error ? err.name : "";
      if (nombre === "AbortError") {
        setEstado({ tipo: "listo", mensaje }); // canceló: puede reintentar
      } else if (nombre === "NotAllowedError") {
        setEstado({ tipo: "listo", mensaje }); // gesto vencido: un toque más
      } else {
        setEstado({ tipo: "error", mensaje: "No se pudo abrir el menú para compartir." });
      }
    }
  }

  async function obtenerMensaje(): Promise<string | null> {
    setEstado({ tipo: "cargando" });
    try {
      const res = await fetch("/api/notificaciones-externas/compartir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoEvento: "PARTE_TURNO", entidadId: parteId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.mensaje) {
        setEstado({ tipo: "error", mensaje: d.error ?? "No se pudo compartir." });
        return null;
      }
      return d.mensaje as string;
    } catch {
      setEstado({ tipo: "error", mensaje: "Ocurrió un error de red." });
      return null;
    }
  }

  async function compartir() {
    const mensaje =
      estado.tipo === "listo" ? estado.mensaje : await obtenerMensaje();
    if (!mensaje) return;

    if (typeof navigator.share === "function") {
      await compartirNativo(mensaje);
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
    setEstado({ tipo: "compartido" });
  }

  async function copiar() {
    const mensaje =
      estado.tipo === "listo" ? estado.mensaje : await obtenerMensaje();
    if (!mensaje) return;
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setEstado({ tipo: "listo", mensaje });
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setEstado({ tipo: "error", mensaje: "No se pudo copiar el texto." });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={compartir}
          disabled={estado.tipo === "cargando"}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {estado.tipo === "cargando"
            ? "Preparando…"
            : estado.tipo === "listo"
              ? "📤 Abrir WhatsApp"
              : estado.tipo === "compartido"
                ? "📤 Compartir de nuevo"
                : "📤 Compartir en el grupo"}
        </button>
        <button
          type="button"
          onClick={copiar}
          disabled={estado.tipo === "cargando"}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {copiado ? "Copiado ✓" : "Copiar texto"}
        </button>
      </div>
      <p role="status" className="text-xs text-gray-500">
        {estado.tipo === "compartido"
          ? "Listo — elegí el grupo de seguridad en WhatsApp."
          : estado.tipo === "error"
            ? <span className="text-red-600">{estado.mensaje}</span>
            : imagenes.length > 0
              ? "En el celular se comparten el texto y las fotos juntos."
              : null}
      </p>
    </div>
  );
}
