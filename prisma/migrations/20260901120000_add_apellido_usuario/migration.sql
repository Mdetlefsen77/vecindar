-- AlterTable: se agrega `apellido`. Arranca con '' (DEFAULT temporal) para que
-- la columna NOT NULL se pueda crear sobre filas ya existentes; el backfill de
-- abajo la completa y el último ALTER quita el default.
ALTER TABLE "usuarios" ADD COLUMN "apellido" TEXT NOT NULL DEFAULT '';

-- Backfill: hasta ahora `nombre` guardaba el nombre completo. Se parte por el
-- ÚLTIMO espacio -> `nombre` = nombre(s) de pila, `apellido` = resto.
-- Postgres evalúa todas las expresiones del SET contra la fila ORIGINAL, así que
-- las dos referencias a "nombre" ven el valor viejo.
-- Filas sin espacio quedan como están (apellido = '').
UPDATE "usuarios"
SET
  "nombre" = substring(
    "nombre" from 1 for length("nombre") - position(' ' in reverse("nombre"))
  ),
  "apellido" = substring(
    "nombre" from length("nombre") - position(' ' in reverse("nombre")) + 2
  )
WHERE position(' ' in "nombre") > 0;

-- A partir de acá `apellido` es obligatorio explícito (siempre lo setea la app).
ALTER TABLE "usuarios" ALTER COLUMN "apellido" DROP DEFAULT;
