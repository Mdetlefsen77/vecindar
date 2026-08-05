/**
 * scripts/seed-usuario-admin.ts
 *
 * Crea (o actualiza) un usuario ADMIN para pruebas locales.
 * Usa upsert por email — seguro correr múltiples veces.
 *
 * Uso:
 *   npx tsx src/scripts/seed-usuario-admin.ts
 */

import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma/client";

const EMAIL = "admin@vecindar.local";
const PASSWORD = "admin123";
const NOMBRE = "Admin Local";

async function main() {
  console.log("🚀 Seed de usuario admin\n");

  const lote = await prisma.lote.findFirst({
    orderBy: [{ manzanaId: "asc" }, { numero: "asc" }],
  });

  if (!lote) {
    throw new Error(
      "No hay lotes en la base. Corré primero: npx tsx src/scripts/seed-lotes.ts",
    );
  }

  const passwordHash = await hash(PASSWORD, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      password: passwordHash,
      nombre: NOMBRE,
      loteId: lote.id,
      verificado: true,
      rol: "ADMIN",
    },
    update: {
      password: passwordHash,
      nombre: NOMBRE,
      verificado: true,
      rol: "ADMIN",
    },
  });

  console.log("✅ Usuario admin listo:");
  console.log(`   Email:    ${usuario.email}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Rol:      ${usuario.rol}`);
  console.log(`   Lote:     #${lote.id} (manzana ${lote.manzanaId}, lote ${lote.numero})`);
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
