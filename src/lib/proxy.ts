import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    "/mapa",
    "/incidentes",
    "/panico",
    "/requerimientos",
    "/mascotas",
    "/admin",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

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
