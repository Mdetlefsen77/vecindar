"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type PushState = "idle" | "loading" | "subscribed" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
    .buffer as ArrayBuffer;
}

/**
 * `true` si la suscripción existente fue creada con otra VAPID public key
 * (típicamente porque se rotaron las keys en el server). Esas suscripciones
 * siguen "vivas" en el navegador pero el server no puede mandarles nada
 * (web-push devuelve 403, que ni siquiera dispara la limpieza de 410/404),
 * así que hay que desuscribir y volver a suscribir con la key nueva.
 */
function claveDesactualizada(
  sub: PushSubscription,
  publicKey: string,
): boolean {
  const actual = sub.options?.applicationServerKey;
  if (!actual) return false; // sin dato para comparar — no forzar re-suscripción
  const esperada = new Uint8Array(urlBase64ToUint8Array(publicKey));
  const tiene = new Uint8Array(actual);
  if (tiene.length !== esperada.length) return true;
  return tiene.some((b, i) => b !== esperada[i]);
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

  // Al montar, chequear si ya hay una suscripción activa.
  // El setState síncrono acá es detección de capacidades/permisos del
  // navegador (una sola vez, sin cascada real), no sincronización de estado
  // derivado — por eso se silencia la regla en este bloque.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const keyPromise = fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((d: { publicKey: string }) => {
        publicKeyRef.current = d.publicKey;
        return d.publicKey;
      })
      .catch(() => null);

    async function registrarYSincronizar() {
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      registrationRef.current = reg;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setState("idle");
        return;
      }

      // Si las VAPID keys se rotaron, la suscripción vieja ya no sirve:
      // desuscribir y rearmar con la key actual antes de mandarla al server.
      const publicKey = await keyPromise;
      if (publicKey && claveDesactualizada(sub, publicKey)) {
        try {
          await sub.unsubscribe();
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        } catch {
          setState("idle");
          return;
        }
      }

      setSubscription(sub);
      setState("subscribed");

      // Re-registrar en el server en cada arranque. El navegador puede seguir
      // teniendo la suscripción mientras el server perdió la fila (limpieza de
      // endpoints 410/404 en enviarPush.ts, reset de DB, migración): sin esto
      // el botón muestra "activas" pero no llega ninguna notificación. El
      // upsert por endpoint lo hace idempotente.
      void fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      }).catch(() => {});
    }

    void registrarYSincronizar().catch(() => setState("idle"));
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

      // Si ya hay una suscripción con otra VAPID key, subscribe() rechazaría
      // ("a subscription with a different applicationServerKey already exists").
      const previa = await reg.pushManager.getSubscription();
      if (previa && claveDesactualizada(previa, publicKey)) {
        await previa.unsubscribe();
      }

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
      setError(err instanceof Error ? err.message : "No se pudo activar.");
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
