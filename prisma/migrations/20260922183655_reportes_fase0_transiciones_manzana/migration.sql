-- CreateEnum
CREATE TYPE "EntidadTransicion" AS ENUM ('INCIDENTE', 'REQUERIMIENTO', 'ALERTA_PANICO');

-- AlterTable
ALTER TABLE "incidentes" ADD COLUMN     "manzanaId" INTEGER;

-- CreateTable
CREATE TABLE "transiciones_estado" (
    "id" SERIAL NOT NULL,
    "entidadTipo" "EntidadTransicion" NOT NULL,
    "entidadId" INTEGER NOT NULL,
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ocurridoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transiciones_estado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transiciones_estado_entidadTipo_entidadId_ocurridoAt_idx" ON "transiciones_estado"("entidadTipo", "entidadId", "ocurridoAt");

-- CreateIndex
CREATE INDEX "incidentes_manzanaId_idx" ON "incidentes"("manzanaId");

-- AddForeignKey
ALTER TABLE "incidentes" ADD CONSTRAINT "incidentes_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transiciones_estado" ADD CONSTRAINT "transiciones_estado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
