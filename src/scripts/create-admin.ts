import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import { hash } from "bcryptjs";

async function main() {
  console.log("🚀 Creando datos de prueba...\n");
  console.log(
    "🔗 Conectando a:",
    process.env.DATABASE_URL?.substring(0, 50) + "...\n",
  );

  // Crear una manzana
  const manzana = await prisma.manzana.create({
    data: {
      numero: "1",
      zona: "Norte",
    },
  });

  console.log("✅ Manzana creada:", manzana);

  // Crear un lote
  const lote = await prisma.lote.create({
    data: {
      numero: "1",
      manzanaId: manzana.id,
      calleFrente: "CALLE PUBLICA A",
      habitado: true,
      latitud: -31.4201,
      longitud: -64.1888,
    },
  });

  console.log("✅ Lote creado:", lote);

  // Hashear contraseña
  const hashedPassword = await hash("admin123", 10);

  // Crear usuario admin
  const usuario = await prisma.usuario.create({
    data: {
      email: "admin@vecindar.com",
      password: hashedPassword,
      nombre: "Administrador",
      telefono: "3512345678",
      loteId: lote.id,
      verificado: true,
      rol: "ADMIN",
    },
  });

  console.log("✅ Usuario admin creado:", {
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });

  console.log("\n🎉 ¡Datos de prueba creados exitosamente!");
  console.log("\n📝 Credenciales de login:");
  console.log("   Email: admin@vecindar.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
