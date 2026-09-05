import crypto from "node:crypto";

/**
 * Cliente mínimo de la API de MercadoPago (REST directo, sin SDK). Cubre lo que
 * usa cobranza: crear un link de pago por período, activar débito automático
 * (preapproval) y leer el estado de un pago / preapproval desde el webhook.
 *
 * Se activa solo si `MP_ACCESS_TOKEN` está en el entorno — igual que las VAPID
 * keys del push. Sin eso, `mpConfigurado()` devuelve false y la UI no muestra
 * los botones de MercadoPago.
 */

const MP_API = "https://api.mercadopago.com";

export function mpConfigurado(): boolean {
  return !!process.env.MP_ACCESS_TOKEN;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`MercadoPago ${path} → ${res.status}: ${detalle}`);
  }
  return res.json() as Promise<T>;
}

// external_reference: así el webhook sabe a qué usuario/período imputar el pago
// sin depender de que MercadoPago nos devuelva metadata.
export function refPago(usuarioId: number, periodo: string): string {
  return `pago:${usuarioId}:${periodo}`;
}
export function refPreapproval(usuarioId: number): string {
  return `preapproval:${usuarioId}`;
}

/** Parsea "pago:12:2026-09" o "preapproval:12". */
export function parseExternalReference(
  ref: string | null | undefined,
):
  | { tipo: "pago"; usuarioId: number; periodo: string }
  | { tipo: "preapproval"; usuarioId: number }
  | null {
  if (!ref) return null;
  const p = ref.split(":");
  if (p[0] === "pago" && p.length === 3) {
    const usuarioId = Number(p[1]);
    if (Number.isInteger(usuarioId) && /^\d{4}-\d{2}$/.test(p[2])) {
      return { tipo: "pago", usuarioId, periodo: p[2] };
    }
  }
  if (p[0] === "preapproval" && p.length === 2) {
    const usuarioId = Number(p[1]);
    if (Number.isInteger(usuarioId)) return { tipo: "preapproval", usuarioId };
  }
  return null;
}

interface PreferenciaResp {
  init_point: string;
  sandbox_init_point?: string;
}

/** Link de pago único para un período. Devuelve la URL a la que mandar al vecino. */
export async function crearPreferenciaPago(opts: {
  usuarioId: number;
  periodo: string;
  periodoLabel: string;
  monto: number;
  emailVecino: string;
}): Promise<string> {
  const pref = await mpFetch<PreferenciaResp>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: opts.periodo,
          title: `Cuota ${opts.periodoLabel} — Barrio`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: opts.monto,
        },
      ],
      payer: { email: opts.emailVecino },
      external_reference: refPago(opts.usuarioId, opts.periodo),
      notification_url: `${baseUrl()}/api/cobranza/mp/webhook`,
      back_urls: {
        success: `${baseUrl()}/mi-suscripcion?mp=ok`,
        failure: `${baseUrl()}/mi-suscripcion?mp=error`,
        pending: `${baseUrl()}/mi-suscripcion?mp=pendiente`,
      },
      auto_return: "approved",
    }),
  });
  return pref.init_point;
}

interface PreapprovalResp {
  id: string;
  init_point: string;
  status: string;
  external_reference?: string;
}

/** Activa el débito automático mensual. Devuelve la URL de autorización. */
export async function crearPreapproval(opts: {
  usuarioId: number;
  monto: number;
  emailVecino: string;
}): Promise<string> {
  const pre = await mpFetch<PreapprovalResp>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: "Cuota mensual del barrio",
      external_reference: refPreapproval(opts.usuarioId),
      payer_email: opts.emailVecino,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: opts.monto,
        currency_id: "ARS",
      },
      back_url: `${baseUrl()}/mi-suscripcion?mp=preapproval`,
      status: "pending",
    }),
  });
  return pre.init_point;
}

export interface MpPago {
  id: number;
  status: string;
  transaction_amount: number;
  external_reference: string | null;
  preapproval_id?: string | null;
  date_approved: string | null;
}

export function getPagoMP(id: string): Promise<MpPago> {
  return mpFetch<MpPago>(`/v1/payments/${id}`);
}

export interface MpPreapproval {
  id: string;
  status: string; // authorized | paused | cancelled | pending
  external_reference: string | null;
}

export function getPreapprovalMP(id: string): Promise<MpPreapproval> {
  return mpFetch<MpPreapproval>(`/preapproval/${id}`);
}

/**
 * Valida la firma del webhook (`x-signature` / `x-request-id`) contra
 * `MP_WEBHOOK_SECRET` — el secreto que se configura al dar de alta el webhook
 * en el panel de MercadoPago. Sin secreto configurado devuelve false (no
 * aceptamos webhooks sin verificar).
 */
export function validarFirmaWebhook(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !opts.xSignature || !opts.dataId) return false;

  const partes: Record<string, string> = {};
  for (const seg of opts.xSignature.split(",")) {
    const [k, v] = seg.split("=");
    if (k && v) partes[k.trim()] = v.trim();
  }
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${opts.dataId.toLowerCase()};request-id:${opts.xRequestId ?? ""};ts:${ts};`;
  const esperado = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  } catch {
    return false;
  }
}
