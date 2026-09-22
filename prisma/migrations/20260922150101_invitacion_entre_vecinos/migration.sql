-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "invitadoPorId" INTEGER;

-- CreateTable
CREATE TABLE "codigos_invitacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "registros" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codigos_invitacion_codigo_key" ON "codigos_invitacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_invitacion_usuarioId_key" ON "codigos_invitacion"("usuarioId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_invitacion" ADD CONSTRAINT "codigos_invitacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
