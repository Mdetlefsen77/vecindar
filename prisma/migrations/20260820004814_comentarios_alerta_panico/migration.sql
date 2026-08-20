-- CreateTable
CREATE TABLE "comentarios_alertas" (
    "id" SERIAL NOT NULL,
    "alertaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_alertas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "comentarios_alertas" ADD CONSTRAINT "comentarios_alertas_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "alertas_panico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_alertas" ADD CONSTRAINT "comentarios_alertas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
