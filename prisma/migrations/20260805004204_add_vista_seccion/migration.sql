-- CreateEnum
CREATE TYPE "SeccionInicio" AS ENUM ('INCIDENTES', 'REQUERIMIENTOS', 'MASCOTAS');

-- CreateTable
CREATE TABLE "vistas_secciones" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "seccion" "SeccionInicio" NOT NULL,
    "vistoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vistas_secciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vistas_secciones_usuarioId_seccion_key" ON "vistas_secciones"("usuarioId", "seccion");

-- AddForeignKey
ALTER TABLE "vistas_secciones" ADD CONSTRAINT "vistas_secciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
