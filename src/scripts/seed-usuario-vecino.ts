/**
 * scripts/seed-usuario-vecino.ts
 *
 * Crea (o actualiza) usuarios VECINO para pruebas locales.
 * Usa upsert por email — seguro correr múltiples veces.
 *
 * Uso:
 *   npx tsx src/scripts/seed-usuario-vecino.ts
 */

import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma/client";

const VECINOS = [
  { email: "vecino1@vecindar.local", nombre: "Vecino Uno" },
  { email: "vecino2@vecindar.local", nombre: "Vecino Dos" },
];
const PASSWORD = "vecino123";

async function main() {
  console.log("🚀 Seed de usuarios VECINO\n");

  const passwordHash = await hash(PASSWORD, 10);

  for (const { email, nombre } of VECINOS) {
    // Cada Usuario necesita un lote propio (relación 1 a 1) — buscamos
    // uno que todavía no tenga usuario asignado.
    const existente = await prisma.usuario.findUnique({ where: { email } });

    const loteId =
      existente?.loteId ??
      (
        await prisma.lote.findFirst({
          where: { usuarios: { none: {} } },
          orderBy: [{ manzanaId: "asc" }, { numero: "asc" }],
        })
      )?.id;

    if (!loteId) {
      throw new Error(
        "No hay lotes libres. Corré primero: npx tsx src/scripts/seed-lotes.ts",
      );
    }

    const usuario = await prisma.usuario.upsert({
      where: { email },
      create: {
        email,
        password: passwordHash,
        nombre,
        loteId,
        verificado: true,
        rol: "VECINO",
      },
      update: {
        password: passwordHash,
        nombre,
        verificado: true,
        rol: "VECINO",
      },
    });

    console.log(`✅ ${usuario.email} — lote #${loteId}`);
  }

  console.log(`\nPassword para todos: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
