import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import { hash } from "bcryptjs";

/**
 * Crea (o actualiza) el usuario ADMIN vinculado al lote 1 de la manzana 1.
 * Seguro de correr múltiples veces (upsert por email).
 */
async function main() {
  console.log("🚀 Creando usuario admin...\n");

  // Buscar el lote 1 de la manzana 1 (ya sembrado por seed-lotes)
  const lote = await prisma.lote.findFirst({
    where: { numero: "1", manzana: { numero: "1" } },
    include: { manzana: true },
  });

  if (!lote) {
    console.error("❌ No se encontró el lote 1 de la manzana 1.");
    console.error("   Asegurate de haber corrido el seed primero:");
    console.error("   npx tsx scripts/seed-lotes.ts");
    process.exit(1);
  }

  console.log(
    `✅ Lote encontrado: MZ ${lote.manzana.numero} · Lote ${lote.numero} (id=${lote.id})`,
  );

  // Si el lote ya tiene otro usuario, usar upsert por email igualmente
  const hashedPassword = await hash("admin123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@vecindar.com" },
    update: {
      password: hashedPassword,
      verificado: true,
      rol: "ADMIN",
    },
    create: {
      email: "admin@vecindar.com",
      password: hashedPassword,
      nombre: "Administrador",
      telefono: "3512345678",
      loteId: lote.id,
      verificado: true,
      rol: "ADMIN",
    },
  });

  console.log("\n✅ Usuario admin listo:");
  console.log(`   Nombre: ${admin.nombre}`);
  console.log(`   Email:  ${admin.email}`);
  console.log(`   Rol:    ${admin.rol}`);
  console.log("\n📝 Credenciales de login:");
  console.log("   Email:    admin@vecindar.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
