-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('VECINO', 'REFERENTE_MANZANA', 'SEGURIDAD', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoIncidente" AS ENUM ('ROBO', 'ROBO_TENTATIVA', 'SOSPECHOSO', 'VANDALISMO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoIncidente" AS ENUM ('ACTIVO', 'RESUELTO', 'FALSA_ALARMA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ENVIADO', 'RECIBIDO', 'EN_ATENCION', 'CERRADO');

-- CreateEnum
CREATE TYPE "CategoriaReq" AS ENUM ('ILUMINACION', 'PODA', 'CALLES', 'LIMPIEZA', 'SEGURIDAD', 'INFRAESTRUCTURA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoRequerimiento" AS ENUM ('NUEVO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoAlertaMascota" AS ENUM ('PERDIDA', 'ENCONTRADA');

-- CreateTable
CREATE TABLE "manzanas" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manzanas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "manzanaId" INTEGER NOT NULL,
    "calleFrente" TEXT NOT NULL,
    "habitado" BOOLEAN NOT NULL DEFAULT false,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residentes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "loteId" INTEGER NOT NULL,
    "esContactoPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "loteId" INTEGER NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "rol" "Rol" NOT NULL DEFAULT 'VECINO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidentes" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoIncidente" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loteId" INTEGER,
    "ubicacionText" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "reportadoPorId" INTEGER NOT NULL,
    "imagenes" TEXT[],
    "estado" "EstadoIncidente" NOT NULL DEFAULT 'ACTIVO',
    "visibleVecinos" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_panico" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ENVIADO',
    "atendioPorId" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibidoAt" TIMESTAMP(3),
    "atendidoAt" TIMESTAMP(3),
    "cerradoAt" TIMESTAMP(3),

    CONSTRAINT "alertas_panico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requerimientos" (
    "id" SERIAL NOT NULL,
    "categoria" "CategoriaReq" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoRequerimiento" NOT NULL DEFAULT 'NUEVO',
    "usuarioId" INTEGER NOT NULL,
    "imagenes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requerimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_requerimientos" (
    "id" SERIAL NOT NULL,
    "requerimientoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_requerimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascotas_perdidas" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoAlertaMascota" NOT NULL,
    "nombre" TEXT,
    "descripcion" TEXT NOT NULL,
    "foto" TEXT,
    "zona" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaAt" TIMESTAMP(3),

    CONSTRAINT "mascotas_perdidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotes_manzanaId_numero_key" ON "lotes"("manzanaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_loteId_key" ON "usuarios"("loteId");

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residentes" ADD CONSTRAINT "residentes_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidentes" ADD CONSTRAINT "incidentes_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidentes" ADD CONSTRAINT "incidentes_reportadoPorId_fkey" FOREIGN KEY ("reportadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_panico" ADD CONSTRAINT "alertas_panico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_panico" ADD CONSTRAINT "alertas_panico_atendioPorId_fkey" FOREIGN KEY ("atendioPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos" ADD CONSTRAINT "requerimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_requerimientos" ADD CONSTRAINT "comentarios_requerimientos_requerimientoId_fkey" FOREIGN KEY ("requerimientoId") REFERENCES "requerimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_requerimientos" ADD CONSTRAINT "comentarios_requerimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas_perdidas" ADD CONSTRAINT "mascotas_perdidas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
