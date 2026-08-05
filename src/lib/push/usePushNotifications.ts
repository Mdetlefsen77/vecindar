"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type PushState = "idle" | "loading" | "subscribed" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer as ArrayBuffer;
}

/**
 * Hook para gestionar la suscripción Web Push de cualquier usuario logueado.
 * Registra el Service Worker, pide permiso y guarda la suscripción en el servidor.
 */
export function usePushNotifications() {
    const [state, setState] = useState<PushState>("idle");
    const [subscription, setSubscription] = useState<PushSubscription | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);

    // Precargados en el mount, para que el click en "Activar" no tenga que
    // esperar un fetch/registro antes de pedir permiso. En mobile, cualquier
    // await previo a pushManager.subscribe() puede hacer que el navegador
    // considere perdido el "user activation" del tap y bloquee el permiso
    // en silencio (sin mostrar el prompt ni tirar un error visible).
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
    const publicKeyRef = useRef<string | null>(null);

    // Al montar, chequear si ya hay una suscripción activa
    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setState("unsupported");
            return;
        }

        if (Notification.permission === "denied") {
            setState("denied");
            return;
        }

        void fetch("/api/push/vapid-public-key")
            .then((r) => r.json())
            .then((d: { publicKey: string }) => {
                publicKeyRef.current = d.publicKey;
            })
            .catch(() => {});

        void navigator.serviceWorker
            .register("/sw.js")
            .then(async (reg) => {
                registrationRef.current = await navigator.serviceWorker.ready;
                return reg.pushManager.getSubscription();
            })
            .then((sub) => {
                if (sub) {
                    setSubscription(sub);
                    setState("subscribed");
                } else {
                    setState("idle");
                }
            })
            .catch(() => setState("idle"));
    }, []);

    const subscribe = useCallback(async () => {
        setState("loading");
        setError(null);
        try {
            const publicKey =
                publicKeyRef.current ??
                (
                    await fetch("/api/push/vapid-public-key").then(
                        (r) => r.json() as Promise<{ publicKey: string }>,
                    )
                ).publicKey;

            const reg =
                registrationRef.current ?? (await navigator.serviceWorker.ready);

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sub.toJSON()),
            });

            setSubscription(sub);
            setState("subscribed");
        } catch (err) {
            const permission = Notification.permission;
            setState(permission === "denied" ? "denied" : "idle");
            setError(
                err instanceof Error ? err.message : "No se pudo activar.",
            );
            console.error("Error al suscribirse a push:", err);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        if (!subscription) return;
        setState("loading");
        try {
            await fetch("/api/push/subscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            await subscription.unsubscribe();
            setSubscription(null);
            setState("idle");
        } catch (err) {
            console.error("Error al desuscribirse:", err);
            setState("subscribed");
        }
    }, [subscription]);

    return { state, subscribe, unsubscribe, error };
}
