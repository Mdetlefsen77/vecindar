import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { Prioridad } from "@/generated/enums";
import { type ConfigSLAModel } from "@/generated/models/ConfigSLA";
import { SLA_DEFAULTS } from "@/lib/utils/sla";

const PRIORIDADES: Prioridad[] = ["CRITICO", "ALTO", "MEDIO", "BAJO"];

// ── GET /api/config/sla ───────────────────────────────────────────────────────
// Devuelve los 4 niveles con sus horasLimite. Si no existen registros usa defaults.
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rows = await prisma.configSLA.findMany();
    const map = Object.fromEntries(rows.map((r: ConfigSLAModel) => [r.prioridad, r.horasLimite]));

    const result = PRIORIDADES.map((p) => ({
        prioridad: p,
        horasLimite: map[p] ?? SLA_DEFAULTS[p],
    }));

    return NextResponse.json(result);
}

// ── PATCH /api/config/sla ─────────────────────────────────────────────────────
// Body: [{ prioridad, horasLimite }, ...]  — solo admin puede modificar
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }

    const body = await req.json();
    if (!Array.isArray(body)) {
        return NextResponse.json({ error: "Se esperaba un array." }, { status: 400 });
    }

    const updates = await Promise.all(
        body
            .filter(
                (item) =>
                    PRIORIDADES.includes(item.prioridad) &&
                    typeof item.horasLimite === "number" &&
                    item.horasLimite > 0,
            )
            .map((item) =>
                prisma.configSLA.upsert({
                    where: { prioridad: item.prioridad as Prioridad },
                    update: { horasLimite: item.horasLimite },
                    create: { prioridad: item.prioridad as Prioridad, horasLimite: item.horasLimite },
                }),
            ),
    );

    return NextResponse.json(updates);
}
