-- CreateEnum
CREATE TYPE "NivelReporte" AS ENUM ('INTERNO', 'INSTITUCIONAL', 'DIFUSION');

-- CreateEnum
CREATE TYPE "PeriodoTipo" AS ENUM ('MENSUAL', 'SEMANAL', 'PERSONALIZADO');

-- CreateTable
CREATE TABLE "reportes" (
    "id" SERIAL NOT NULL,
    "numero" SERIAL NOT NULL,
    "nivel" "NivelReporte" NOT NULL,
    "periodoTipo" "PeriodoTipo" NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "generadoPorId" INTEGER NOT NULL,
    "generadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "datos" JSONB NOT NULL,

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reportes_numero_key" ON "reportes"("numero");

-- CreateIndex
CREATE INDEX "reportes_periodoInicio_periodoFin_nivel_generadoAt_idx" ON "reportes"("periodoInicio", "periodoFin", "nivel", "generadoAt");

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_generadoPorId_fkey" FOREIGN KEY ("generadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
