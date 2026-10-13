-- CreateEnum
CREATE TYPE "GrupoOficio" AS ENUM ('HOGAR', 'JARDIN', 'TECNOLOGIA', 'VEHICULOS', 'SALUD_BELLEZA', 'EDUCACION', 'CUIDADOS', 'LIMPIEZA', 'GASTRONOMIA_EVENTOS', 'PROFESIONALES', 'TRANSPORTE', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoOficio" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAUSADO');

-- CreateTable
CREATE TABLE "categorias_oficio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "grupo" "GrupoOficio" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_oficio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oficios" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "categoriaSugerida" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "disponibilidad" TEXT,
    "telefono" TEXT NOT NULL,
    "imagenes" TEXT[],
    "estado" "EstadoOficio" NOT NULL DEFAULT 'PENDIENTE',
    "motivoEstado" TEXT,
    "aprobadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oficios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendaciones_oficio" (
    "id" SERIAL NOT NULL,
    "oficioId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recomendaciones_oficio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_oficio" (
    "id" SERIAL NOT NULL,
    "oficioId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "detalle" TEXT NOT NULL,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_oficio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_oficio_nombre_key" ON "categorias_oficio"("nombre");

-- CreateIndex
CREATE INDEX "oficios_estado_categoriaId_idx" ON "oficios"("estado", "categoriaId");

-- CreateIndex
CREATE INDEX "oficios_usuarioId_idx" ON "oficios"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "recomendaciones_oficio_oficioId_autorId_key" ON "recomendaciones_oficio"("oficioId", "autorId");

-- CreateIndex
CREATE INDEX "reportes_oficio_resuelto_idx" ON "reportes_oficio"("resuelto");

-- AddForeignKey
ALTER TABLE "oficios" ADD CONSTRAINT "oficios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oficios" ADD CONSTRAINT "oficios_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_oficio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones_oficio" ADD CONSTRAINT "recomendaciones_oficio_oficioId_fkey" FOREIGN KEY ("oficioId") REFERENCES "oficios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones_oficio" ADD CONSTRAINT "recomendaciones_oficio_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_oficio" ADD CONSTRAINT "reportes_oficio_oficioId_fkey" FOREIGN KEY ("oficioId") REFERENCES "oficios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_oficio" ADD CONSTRAINT "reportes_oficio_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carga inicial de rubros. El admin suma más desde /admin/oficios.
INSERT INTO "categorias_oficio" ("nombre", "grupo") VALUES
  ('Albañilería', 'HOGAR'),
  ('Plomería', 'HOGAR'),
  ('Gasista matriculado', 'HOGAR'),
  ('Electricidad', 'HOGAR'),
  ('Pintura', 'HOGAR'),
  ('Carpintería', 'HOGAR'),
  ('Herrería', 'HOGAR'),
  ('Techos e impermeabilización', 'HOGAR'),
  ('Durlock y yesería', 'HOGAR'),
  ('Cerrajería', 'HOGAR'),
  ('Vidriería', 'HOGAR'),
  ('Pisos y revestimientos', 'HOGAR'),
  ('Aberturas (puertas y ventanas)', 'HOGAR'),
  ('Aire acondicionado', 'HOGAR'),
  ('Calefacción', 'HOGAR'),
  ('Destapaciones', 'HOGAR'),
  ('Fumigación y control de plagas', 'HOGAR'),
  ('Piletas (construcción y mantenimiento)', 'HOGAR'),
  ('Limpieza de tanques', 'HOGAR'),
  ('Arquitectura', 'HOGAR'),
  ('Maestro mayor de obras', 'HOGAR'),
  ('Portones automáticos', 'HOGAR'),
  ('Energía solar', 'HOGAR'),
  ('Muebles a medida', 'HOGAR'),
  ('Armado de muebles', 'HOGAR'),
  ('Pequeños arreglos (handyman)', 'HOGAR'),
  ('Jardinería', 'JARDIN'),
  ('Paisajismo', 'JARDIN'),
  ('Poda y extracción de árboles', 'JARDIN'),
  ('Corte de césped', 'JARDIN'),
  ('Riego automático', 'JARDIN'),
  ('Vivero y plantas', 'JARDIN'),
  ('Reparación de PC y notebooks', 'TECNOLOGIA'),
  ('Reparación de celulares', 'TECNOLOGIA'),
  ('Redes y wifi', 'TECNOLOGIA'),
  ('Cámaras de seguridad y alarmas', 'TECNOLOGIA'),
  ('Reparación de electrodomésticos', 'TECNOLOGIA'),
  ('Antenas y TV', 'TECNOLOGIA'),
  ('Diseño web y programación', 'TECNOLOGIA'),
  ('Electrónica', 'TECNOLOGIA'),
  ('Mecánica', 'VEHICULOS'),
  ('Electricidad del automotor', 'VEHICULOS'),
  ('Gomería', 'VEHICULOS'),
  ('Chapa y pintura', 'VEHICULOS'),
  ('Lavado de autos', 'VEHICULOS'),
  ('Bicicletería', 'VEHICULOS'),
  ('Motos', 'VEHICULOS'),
  ('Peluquería', 'SALUD_BELLEZA'),
  ('Barbería', 'SALUD_BELLEZA'),
  ('Manicura y pedicura', 'SALUD_BELLEZA'),
  ('Depilación', 'SALUD_BELLEZA'),
  ('Maquillaje', 'SALUD_BELLEZA'),
  ('Masajes', 'SALUD_BELLEZA'),
  ('Cosmetología', 'SALUD_BELLEZA'),
  ('Kinesiología', 'SALUD_BELLEZA'),
  ('Enfermería', 'SALUD_BELLEZA'),
  ('Psicología', 'SALUD_BELLEZA'),
  ('Nutrición', 'SALUD_BELLEZA'),
  ('Entrenamiento personal', 'SALUD_BELLEZA'),
  ('Yoga y pilates', 'SALUD_BELLEZA'),
  ('Odontología', 'SALUD_BELLEZA'),
  ('Podología', 'SALUD_BELLEZA'),
  ('Clases de primaria', 'EDUCACION'),
  ('Clases de secundaria', 'EDUCACION'),
  ('Apoyo universitario', 'EDUCACION'),
  ('Idiomas', 'EDUCACION'),
  ('Música', 'EDUCACION'),
  ('Arte y dibujo', 'EDUCACION'),
  ('Clases de computación', 'EDUCACION'),
  ('Apoyo escolar y psicopedagogía', 'EDUCACION'),
  ('Niñera y cuidado de niños', 'CUIDADOS'),
  ('Cuidado de adultos mayores', 'CUIDADOS'),
  ('Paseo de perros', 'CUIDADOS'),
  ('Cuidado de mascotas', 'CUIDADOS'),
  ('Peluquería canina', 'CUIDADOS'),
  ('Veterinaria', 'CUIDADOS'),
  ('Adiestramiento canino', 'CUIDADOS'),
  ('Limpieza del hogar', 'LIMPIEZA'),
  ('Limpieza de vidrios', 'LIMPIEZA'),
  ('Lavado de alfombras y tapizados', 'LIMPIEZA'),
  ('Planchado', 'LIMPIEZA'),
  ('Tapicería', 'LIMPIEZA'),
  ('Costura y arreglos de ropa', 'LIMPIEZA'),
  ('Limpieza de final de obra', 'LIMPIEZA'),
  ('Catering', 'GASTRONOMIA_EVENTOS'),
  ('Pastelería y tortas', 'GASTRONOMIA_EVENTOS'),
  ('Viandas', 'GASTRONOMIA_EVENTOS'),
  ('Panificados caseros', 'GASTRONOMIA_EVENTOS'),
  ('Organización de eventos', 'GASTRONOMIA_EVENTOS'),
  ('Fotografía', 'GASTRONOMIA_EVENTOS'),
  ('Video', 'GASTRONOMIA_EVENTOS'),
  ('DJ y sonido', 'GASTRONOMIA_EVENTOS'),
  ('Animación infantil', 'GASTRONOMIA_EVENTOS'),
  ('Alquiler de vajilla y mobiliario', 'GASTRONOMIA_EVENTOS'),
  ('Contabilidad', 'PROFESIONALES'),
  ('Abogacía', 'PROFESIONALES'),
  ('Escribanía', 'PROFESIONALES'),
  ('Gestoría', 'PROFESIONALES'),
  ('Seguros', 'PROFESIONALES'),
  ('Inmobiliaria', 'PROFESIONALES'),
  ('Diseño gráfico', 'PROFESIONALES'),
  ('Marketing y redes sociales', 'PROFESIONALES'),
  ('Traducción', 'PROFESIONALES'),
  ('Ingeniería', 'PROFESIONALES'),
  ('Agrimensura', 'PROFESIONALES'),
  ('Fletes y mudanzas', 'TRANSPORTE'),
  ('Traslados y remis', 'TRANSPORTE'),
  ('Mensajería y cadetería', 'TRANSPORTE'),
  ('Otros', 'OTROS');
