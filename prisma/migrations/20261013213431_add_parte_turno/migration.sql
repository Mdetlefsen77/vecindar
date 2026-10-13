-- CreateEnum
CREATE TYPE "TurnoGuardia" AS ENUM ('MANANA', 'MEDIODIA', 'MEDIATARDE', 'NOCHE');

-- CreateEnum
CREATE TYPE "EstadoRonda" AS ENUM ('FINALIZADA', 'PARCIAL', 'NO_REALIZADA');

-- CreateEnum
CREATE TYPE "NivelCirculacion" AS ENUM ('ESCASA', 'NORMAL', 'INTENSA');

-- AlterEnum
ALTER TYPE "TipoEventoPublicacion" ADD VALUE 'PARTE_TURNO';

-- CreateTable
CREATE TABLE "partes_turno" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "turno" "TurnoGuardia" NOT NULL,
    "ronda" "EstadoRonda" NOT NULL,
    "circulacion" "NivelCirculacion" NOT NULL,
    "presenciaPolicial" BOOLEAN NOT NULL,
    "recomendacion" TEXT NOT NULL,
    "novedades" TEXT,
    "imagenes" TEXT[],
    "autorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partes_turno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partes_turno_createdAt_idx" ON "partes_turno"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partes_turno_fecha_turno_key" ON "partes_turno"("fecha", "turno");

-- AddForeignKey
ALTER TABLE "partes_turno" ADD CONSTRAINT "partes_turno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
