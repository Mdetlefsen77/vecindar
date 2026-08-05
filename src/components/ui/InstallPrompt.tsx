"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const DISMISSED_KEY = "vecindar-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// No hay evento nativo para "cambió el estado de instalación/localStorage";
// sólo necesitamos leerlo una vez del lado del cliente sin romper la
// hidratación (SSR no conoce `window`), así que no hace falta suscripción.
function noopSubscribe() {
  return () => {};
}

function getServerSnapshotFalse() {
  return false;
}

export default function InstallPrompt() {
  const eligible = useSyncExternalStore(
    noopSubscribe,
    () => !isStandalone() && localStorage.getItem(DISMISSED_KEY) !== "1",
    getServerSnapshotFalse,
  );
  const showIosHint = useSyncExternalStore(
    noopSubscribe,
    isIos,
    getServerSnapshotFalse,
  );

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!eligible) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [eligible]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!eligible || dismissed || (!deferredPrompt && !showIosHint))
    return null;

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+12px)] md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-base font-black tracking-tight">
            V
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Instalá Vecindar en tu celular
          </p>
          {showIosHint ? (
            <p className="mt-1 text-sm text-gray-600">
              Tocá{" "}
              <span className="font-medium">Compartir</span> (
              <span aria-hidden>⬆️</span>) y luego{" "}
              <span className="font-medium">&quot;Agregar a inicio&quot;</span>
              . Así recibís notificaciones y no tenés que loguearte cada vez.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              Se abre como una app aparte, recibís notificaciones y no tenés
              que loguearte cada vez.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {deferredPrompt && (
              <button
                onClick={install}
                className="min-h-[36px] px-3 py-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Instalar
              </button>
            )}
            <button
              onClick={dismiss}
              className="min-h-[36px] px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
