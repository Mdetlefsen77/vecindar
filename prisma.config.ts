// npm install --save-dev prisma dotenv
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // El CLI de Prisma (generate/migrate/studio) usa esta URL — separada de
    // la que usa la app en runtime (src/lib/prisma/client.ts, que sigue
    // leyendo DATABASE_URL directo). Migrate necesita una conexión que
    // sostenga session/locks; el pooler en modo "transaction" (pgbouncer,
    // puerto 6543) no lo soporta y hace que `migrate deploy` se cuelgue.
    // DIRECT_URL debe apuntar a una conexión directa o al pooler en modo
    // "session" (puerto 5432). Si no está seteada, cae a DATABASE_URL
    // (caso típico de desarrollo local, donde no hay pooler de por medio).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
