/**
 * scripts/seed-usuario-staff.ts
 *
 * Crea (o actualiza) usuarios SEGURIDAD, REFERENTE_MANZANA y TESORERO para
 * pruebas locales. Usa upsert por email — seguro correr múltiples veces.
 *
 * Uso:
 *   npx tsx src/scripts/seed-usuario-staff.ts
 */

import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma/client";
import type { Rol } from "../generated/enums";

const STAFF: { email: string; nombre: string; apellido: string; rol: Rol }[] = [
  {
    email: "seguridad@vecindar.local",
    nombre: "Seguridad",
    apellido: "Local",
    rol: "SEGURIDAD",
  },
  {
    email: "referente@vecindar.local",
    nombre: "Referente",
    apellido: "de Manzana",
    rol: "REFERENTE_MANZANA",
  },
  {
    email: "tesorero@vecindar.local",
    nombre: "Tesorero",
    apellido: "Local",
    rol: "TESORERO",
  },
];
const PASSWORD = "staff123";

async function main() {
  console.log("🚀 Seed de usuarios SEGURIDAD / REFERENTE_MANZANA / TESORERO\n");

  const passwordHash = await hash(PASSWORD, 10);

  for (const { email, nombre, apellido, rol } of STAFF) {
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
        apellido,
        loteId,
        verificado: true,
        rol,
      },
      update: {
        password: passwordHash,
        nombre,
        apellido,
        verificado: true,
        rol,
      },
    });

    console.log(`✅ ${usuario.email} (${usuario.rol}) — lote #${loteId}`);
  }

  console.log(`\nPassword para todos: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
