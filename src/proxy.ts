import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Proxy (antes "middleware"): primera barrera de auth, corre en el edge antes de
// renderizar. Verifica la firma del JWT de sesión — la verificación de rol y los
// datos finos siguen en cada layout / route handler del servidor.
const RUTAS_PROTEGIDAS = [
  "/inicio",
  "/mapa",
  "/incidentes",
  "/panico",
  "/requerimientos",
  "/mascotas",
  "/seguridad",
  "/admin",
];

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    // Mismo secreto que usa NextAuth para firmar (AUTH_SECRET tiene prioridad
    // sobre NEXTAUTH_SECRET en Auth.js v5).
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  const esRutaProtegida = RUTAS_PROTEGIDAS.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (esRutaProtegida && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Ya logueado: no tiene sentido mostrar el login.
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/mapa", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/inicio/:path*",
    "/mapa/:path*",
    "/incidentes/:path*",
    "/panico/:path*",
    "/requerimientos/:path*",
    "/mascotas/:path*",
    "/seguridad/:path*",
    "/admin/:path*",
    "/login",
  ],
};
