-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('CRITICO', 'ALTO', 'MEDIO', 'BAJO');

-- AlterTable
ALTER TABLE "incidentes" ADD COLUMN     "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIO';

-- AlterTable
ALTER TABLE "requerimientos" ADD COLUMN     "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIO';

-- CreateTable
CREATE TABLE "config_sla" (
    "id" SERIAL NOT NULL,
    "prioridad" "Prioridad" NOT NULL,
    "horasLimite" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_sla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "config_sla_prioridad_key" ON "config_sla"("prioridad");
