import { NextRequest, NextResponse } from "next/server";
import {
  resolverCodigo,
  registrarClick,
  COOKIE_INVITACION,
} from "@/lib/crecimiento/invitaciones";

type Params = { params: Promise<{ codigo: string }> };

// GET /i/{codigo} — link de invitación entre vecinos (público, sin auth).
// Registra el click, guarda el código en cookie para atribuir el registro
// que venga después (POST /api/usuarios lo lee) y manda a /registro.
export async function GET(req: NextRequest, { params }: Params) {
  const { codigo } = await params;
  const url = req.nextUrl.clone();

  const resuelto = await resolverCodigo(codigo);
  if (!resuelto) {
    url.pathname = "/registro";
    url.search = "";
    return NextResponse.redirect(url);
  }

  void registrarClick(resuelto.codigoId);

  url.pathname = "/registro";
  url.search = "?invitacion=1";
  const response = NextResponse.redirect(url);
  response.cookies.set(COOKIE_INVITACION, codigo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 días — tiempo de sobra para que complete el registro
    path: "/",
  });
  return response;
}
