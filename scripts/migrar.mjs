// Aplica las migraciones pendientes en el build, salvo en los previews de
// Vercel: comparten la DB de producción y aplicarían migraciones de ramas
// sin mergear (ya pasó: un enum nuevo rompió /admin/oficios en prod).
import { execSync } from "node:child_process";

const entorno = process.env.VERCEL_ENV;
if (entorno && entorno !== "production") {
  console.log(`[migrar] VERCEL_ENV=${entorno}: se omite prisma migrate deploy.`);
} else {
  execSync("prisma migrate deploy", { stdio: "inherit" });
}
