import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import { hash } from "bcryptjs";

async function main() {
  const lote = await prisma.lote.findFirst({
    where: { numero: "2", manzana: { numero: "1" } },
    include: { manzana: true },
  });

  if (!lote) {
    console.error("❌ Lote no encontrado. Corré seed-lotes primero.");
    process.exit(1);
  }

  const pw = await hash("vecino123", 10);
  const u = await prisma.usuario.upsert({
    where: { email: "vecino@vecindar.com" },
    update: { password: pw, verificado: true, rol: "VECINO" },
    create: {
      email: "vecino@vecindar.com",
      password: pw,
      nombre: "Vecino Prueba",
      loteId: lote.id,
      verificado: true,
      rol: "VECINO",
    },
  });

  console.log(`✅ Usuario vecino listo: ${u.email} · ${u.rol}`);
  console.log("   Password: vecino123");
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
