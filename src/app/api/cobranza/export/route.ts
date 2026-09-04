import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireRoleSession } from "@/lib/api/guard";
import { GESTORES_COBRANZA } from "@/lib/permisos";
import { nombreCompleto } from "@/lib/usuarios";

// GET /api/cobranza/export?anio=2026 — CSV de pagos (solo ADMIN).
// Sin ?anio devuelve todos los pagos.
export async function GET(req: NextRequest) {
  const guard = await requireRoleSession(GESTORES_COBRANZA);
  if (guard.response) return guard.response;

  const anio = new URL(req.url).searchParams.get("anio");
  const where =
    anio && /^\d{4}$/.test(anio) ? { periodo: { startsWith: `${anio}-` } } : {};

  const pagos = await prisma.pago.findMany({
    where,
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          email: true,
          lote: {
            select: { numero: true, manzana: { select: { numero: true } } },
          },
        },
      },
      registradoPor: { select: { nombre: true, apellido: true } },
    },
    orderBy: [{ periodo: "desc" }, { fecha: "desc" }],
  });

  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    [
      "periodo",
      "fecha",
      "usuario",
      "email",
      "lote",
      "monto",
      "metodo",
      "nota",
      "registrado_por",
    ].join(","),
    ...pagos.map((p) =>
      [
        p.periodo,
        p.fecha.toISOString().slice(0, 10),
        nombreCompleto(p.usuario),
        p.usuario.email,
        `MZ ${p.usuario.lote.manzana.numero} - ${p.usuario.lote.numero}`,
        p.monto,
        p.metodo,
        p.nota ?? "",
        nombreCompleto(p.registradoPor),
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos${anio ? `-${anio}` : ""}.csv"`,
    },
  });
}
