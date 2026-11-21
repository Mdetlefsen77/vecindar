-- CreateTable
CREATE TABLE "respuestas_encuesta" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ronda" TEXT NOT NULL,
    "facilidad" INTEGER NOT NULL,
    "seLee" TEXT NOT NULL,
    "nps" INTEGER NOT NULL,
    "gusta" TEXT,
    "cambiaria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_encuesta_usuarioId_ronda_key" ON "respuestas_encuesta"("usuarioId", "ronda");

-- AddForeignKey
ALTER TABLE "respuestas_encuesta" ADD CONSTRAINT "respuestas_encuesta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
