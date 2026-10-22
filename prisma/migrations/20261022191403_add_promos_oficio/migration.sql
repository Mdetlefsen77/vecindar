-- CreateEnum
CREATE TYPE "DuracionPromo" AS ENUM ('DIA', 'SEMANA');

-- CreateTable
CREATE TABLE "promos_oficio" (
    "id" SERIAL NOT NULL,
    "oficioId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioAntes" INTEGER,
    "precioAhora" INTEGER,
    "imagen" TEXT,
    "duracion" "DuracionPromo" NOT NULL,
    "venceAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promos_oficio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promos_oficio_oficioId_key" ON "promos_oficio"("oficioId");

-- CreateIndex
CREATE INDEX "promos_oficio_venceAt_idx" ON "promos_oficio"("venceAt");

-- AddForeignKey
ALTER TABLE "promos_oficio" ADD CONSTRAINT "promos_oficio_oficioId_fkey" FOREIGN KEY ("oficioId") REFERENCES "oficios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
