"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface SosAlertData {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  tipo?: string;
}

/**
 * Escucha los push de tipo "SOS" reenviados por el Service Worker (llegan
 * aunque la pestaña esté abierta y en foco) y muestra un popup con alarma
 * sonora en loop hasta que el admin/seguridad lo cierra o va a atenderla.
 * Se monta solo para ADMIN/SEGURIDAD — ver DashboardLayout.
 */
export default function SosAlertListener() {
  const router = useRouter();
  const [alerta, setAlerta] = useState<SosAlertData | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const msg = event.data as
        | { type?: string; payload?: SosAlertData }
        | undefined;
      if (msg?.type === "PUSH_RECIBIDO" && msg.payload?.tipo === "SOS") {
        setAlerta(msg.payload);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!alerta) return;

    // "ring, ring... ring, ring..." — dos tonos alternados, en loop, hasta
    // que se cierra el popup. Si el navegador bloquea el audio (autoplay
    // sin interacción previa), la notificación del sistema sigue sonando.
    let activo = true;
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    audioCtxRef.current = ctx;

    function tono(frecuencia: number) {
      if (!activo) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = frecuencia;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }

    tono(880);
    let alterna = false;
    intervalRef.current = setInterval(() => {
      tono(alterna ? 880 : 1046);
      alterna = !alterna;
    }, 350);

    return () => {
      activo = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      void ctx.close().catch(() => {});
    };
  }, [alerta]);

  function cerrar() {
    setAlerta(null);
  }

  function verAlerta() {
    const url = alerta?.url ?? "/panico";
    setAlerta(null);
    router.push(url);
  }

  return (
    <Dialog open={!!alerta} onClose={cerrar} className="relative z-[9999]">
      <DialogBackdrop className="fixed inset-0 bg-black/60" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6 text-center space-y-4 border-4 border-red-600">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <span className="text-3xl">🆘</span>
          </div>
          <DialogTitle className="text-xl font-bold text-red-700">
            {alerta?.title ?? "Alerta SOS"}
          </DialogTitle>
          <p className="text-gray-700 text-sm">{alerta?.body}</p>
          <div className="flex gap-2">
            <button
              onClick={cerrar}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={verAlerta}
              className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
            >
              Ver alerta
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
