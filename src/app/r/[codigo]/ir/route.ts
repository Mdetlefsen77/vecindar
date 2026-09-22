import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  resolverLink,
  registrarClickLink,
  COOKIE_ORIGEN_WHATSAPP,
} from "@/lib/notificaciones-externas/links";
import { rateLimit, clientIp } from "@/lib/api/rateLimit";

type Params = { params: Promise<{ codigo: string }> };

// GET /r/{codigo}/ir — redirección real (público, sin auth). Solo la
// alcanza un navegador que ejecutó el interstitial de /r/{codigo}, nunca un
// crawler de vista previa — por eso acá, y no en /r/{codigo}, es donde se
// registra el click. `proxy.ts` decide después si la ruta real pide sesión.
export async function GET(req: NextRequest, { params }: Params) {
  const { codigo } = await params;

  if (!rateLimit(`r-ir:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Demasiados intentos, esperá un momento." },
      { status: 429 },
    );
  }

  const link = await resolverLink(codigo);
  if (!link) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const session = await auth();
  void registrarClickLink(link.id, {
    tenerSesion: !!session?.user,
    usuarioId: session?.user?.id ? Number(session.user.id) : undefined,
  });

  const response = NextResponse.redirect(new URL(link.urlDestino, req.url));

  // Atribución de origen de registro (tarea 5.2) — mismo criterio que
  // COOKIE_INVITACION: no bloquea nada si después no se usa, solo marca de
  // dónde vino la sesión que se abra a partir de acá.
  if (!session?.user) {
    response.cookies.set(COOKIE_ORIGEN_WHATSAPP, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  return response;
}
