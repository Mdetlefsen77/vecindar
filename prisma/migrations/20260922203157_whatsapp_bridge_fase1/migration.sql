-- CreateEnum
CREATE TYPE "CanalExterno" AS ENUM ('WHATSAPP', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "TipoEventoPublicacion" AS ENUM ('INCIDENTE', 'REQUERIMIENTO', 'MASCOTA', 'ALERTA_PANICO', 'RESUMEN');

-- CreateEnum
CREATE TYPE "EstadoPublicacion" AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'OMITIDA');

-- CreateEnum
CREATE TYPE "ModoPublicacion" AS ENUM ('AUTOMATICA', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrigenRegistro" AS ENUM ('DIRECTO', 'WHATSAPP');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "origenRegistro" "OrigenRegistro" NOT NULL DEFAULT 'DIRECTO';

-- CreateTable
CREATE TABLE "publicaciones_externas" (
    "id" SERIAL NOT NULL,
    "canal" "CanalExterno" NOT NULL,
    "tipoEvento" "TipoEventoPublicacion" NOT NULL,
    "entidadId" INTEGER,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'PENDIENTE',
    "claveIdempotencia" TEXT NOT NULL,
    "modo" "ModoPublicacion" NOT NULL,
    "publicadaPorId" INTEGER,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,
    "creadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaAt" TIMESTAMP(3),

    CONSTRAINT "publicaciones_externas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links_rastreables" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "urlDestino" TEXT NOT NULL,
    "publicacionId" INTEGER,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3),

    CONSTRAINT "links_rastreables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks_links" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "ocurridoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenerSesion" BOOLEAN NOT NULL,
    "usuarioId" INTEGER,

    CONSTRAINT "clicks_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publicaciones_externas_claveIdempotencia_key" ON "publicaciones_externas"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "publicaciones_externas_estado_idx" ON "publicaciones_externas"("estado");

-- CreateIndex
CREATE INDEX "publicaciones_externas_tipoEvento_entidadId_idx" ON "publicaciones_externas"("tipoEvento", "entidadId");

-- CreateIndex
CREATE UNIQUE INDEX "links_rastreables_codigo_key" ON "links_rastreables"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "links_rastreables_publicacionId_key" ON "links_rastreables"("publicacionId");

-- CreateIndex
CREATE INDEX "clicks_links_linkId_idx" ON "clicks_links"("linkId");

-- AddForeignKey
ALTER TABLE "publicaciones_externas" ADD CONSTRAINT "publicaciones_externas_publicadaPorId_fkey" FOREIGN KEY ("publicadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links_rastreables" ADD CONSTRAINT "links_rastreables_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "publicaciones_externas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks_links" ADD CONSTRAINT "clicks_links_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links_rastreables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks_links" ADD CONSTRAINT "clicks_links_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
