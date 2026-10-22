-- CreateEnum
CREATE TYPE "TipoAviso" AS ENUM ('ANIMALES', 'PERRO_SUELTO', 'CORTE_LUZ', 'CORTE_AGUA', 'CALLE_CORTADA', 'ARBOL_CAIDO', 'PERDIDO_ENCONTRADO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoConfirmacion" AS ENUM ('SIGUE', 'RESUELTO');

-- CreateTable
CREATE TABLE "avisos" (
    "id" SERIAL NOT NULL,
    "autorId" INTEGER NOT NULL,
    "tipo" "TipoAviso" NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "detalle" TEXT,
    "imagen" TEXT,
    "venceAt" TIMESTAMP(3) NOT NULL,
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmaciones_aviso" (
    "avisoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoConfirmacion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confirmaciones_aviso_pkey" PRIMARY KEY ("avisoId","usuarioId")
);

-- CreateIndex
CREATE INDEX "avisos_venceAt_idx" ON "avisos"("venceAt");

-- CreateIndex
CREATE INDEX "avisos_autorId_createdAt_idx" ON "avisos"("autorId", "createdAt");

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_aviso" ADD CONSTRAINT "confirmaciones_aviso_avisoId_fkey" FOREIGN KEY ("avisoId") REFERENCES "avisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_aviso" ADD CONSTRAINT "confirmaciones_aviso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
