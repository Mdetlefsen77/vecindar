import { NextRequest, NextResponse } from "next/server";
import { resolverLinkParaVistaPrevia } from "@/lib/notificaciones-externas/links";
import { vistaPreviaPorTipo } from "@/lib/notificaciones-externas/vistaPrevia";

type Params = { params: Promise<{ codigo: string }> };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// GET /r/{codigo} — interstitial público (sin auth) para links compartidos
// hacia un canal externo (WhatsApp). Sirve SIEMPRE el mismo HTML con
// metatags OG genéricas/por tipo + una redirección del lado del cliente
// hacia /r/{codigo}/ir, que es quien hace el 302 real y registra el click.
// Un crawler de vista previa lee las metatags y no ejecuta la redirección;
// un navegador real la ejecuta al instante. Ver design.md, decisión "Vista
// previa vía interstitial con metarefresh, no detección de user-agent".
export async function GET(req: NextRequest, { params }: Params) {
  const { codigo } = await params;
  const resuelto = await resolverLinkParaVistaPrevia(codigo);

  if (!resuelto) {
    return new NextResponse(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Vecindar</title></head><body><p>Este link ya no está disponible.</p><p><a href="/">Ir a Vecindar</a></p></body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const { titulo, descripcion } = vistaPreviaPorTipo(resuelto.tipoEvento);
  const imagen = `${req.nextUrl.origin}/images/icon-512.png`;
  const destino = `/r/${encodeURIComponent(codigo)}/ir`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titulo)}</title>
<meta name="description" content="${escapeHtml(descripcion)}">
<meta property="og:title" content="${escapeHtml(titulo)}">
<meta property="og:description" content="${escapeHtml(descripcion)}">
<meta property="og:image" content="${imagen}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0; url=${destino}">
<script>location.replace(${JSON.stringify(destino)});</script>
</head>
<body>
<p>Abriendo Vecindar… <a href="${destino}">Continuar</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
