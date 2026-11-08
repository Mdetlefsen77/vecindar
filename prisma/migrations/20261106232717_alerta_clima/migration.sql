-- CreateTable
CREATE TABLE "alertas_clima" (
    "id" SERIAL NOT NULL,
    "fecha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_clima_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alertas_clima_fecha_key" ON "alertas_clima"("fecha");
