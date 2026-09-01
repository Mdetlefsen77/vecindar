import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export type AuthedSession = Session & { user: NonNullable<Session["user"]> };

/**
 * id numérico del usuario logueado. En el JWT se guarda como string (requisito
 * de NextAuth), así que casi todos los handlers hacían `parseInt(session.user.id!)`.
 */
export function getUserId(session: { user: { id: string } }): number {
  return Number(session.user.id);
}

type SessionResult =
  | { session: AuthedSession; response?: undefined }
  | { session?: undefined; response: NextResponse };

/**
 * Verifica que haya una sesión activa. Devuelve la sesión o una respuesta
 * 401 lista para retornar, evitando repetir el chequeo en cada route handler.
 */
export async function requireSession(
  message = "No autorizado",
): Promise<SessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: message }, { status: 401 }) };
  }
  return { session: session as AuthedSession };
}

/**
 * Verifica que el rol de la sesión esté entre los permitidos.
 * Devuelve una respuesta 403 lista para retornar, o null si tiene permiso.
 */
export function requireRole(
  role: string | undefined,
  allowed: readonly string[],
  message = "Sin permisos.",
): NextResponse | null {
  if (!role || !allowed.includes(role)) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return null;
}

/**
 * Variante combinada: sin sesión o con rol no permitido devuelven la misma
 * respuesta 403 (patrón usado en endpoints solo-admin que no distinguen
 * "no autenticado" de "sin permisos").
 */
export async function requireRoleSession(
  allowed: readonly string[],
  message = "Sin permisos.",
): Promise<SessionResult> {
  const session = await auth();
  if (!session?.user || !allowed.includes(session.user.role)) {
    return { response: NextResponse.json({ error: message }, { status: 403 }) };
  }
  return { session: session as AuthedSession };
}
