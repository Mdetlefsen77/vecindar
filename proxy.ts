import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Rutas protegidas
  const protectedRoutes = [
    "/mapa",
    "/incidentes",
    "/panico",
    "/requerimientos",
    "/mascotas",
    "/admin",
  ];

  // Verificar si la ruta actual es protegida
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Si es ruta protegida y no hay token, redirigir a login
  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // Si está logueado e intenta ir a login, redirigir a mapa
  if (pathname === "/login" && token) {
    const url = new URL("/mapa", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/mapa/:path*",
    "/incidentes/:path*",
    "/panico/:path*",
    "/requerimientos/:path*",
    "/mascotas/:path*",
    "/admin/:path*",
    "/login",
  ],
};
