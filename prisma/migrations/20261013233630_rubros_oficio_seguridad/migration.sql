-- Grupo "Seguridad" del catálogo de oficios (el valor del enum se agrega en
-- la migración anterior: Postgres no permite usarlo en la misma transacción).

-- Ya existía en Tecnología: se mueve al grupo nuevo.
UPDATE "categorias_oficio" SET "grupo" = 'SEGURIDAD'
WHERE "nombre" = 'Cámaras de seguridad y alarmas';

INSERT INTO "categorias_oficio" ("nombre", "grupo") VALUES
  ('Seguridad privada y vigilancia', 'SEGURIDAD'),
  ('Monitoreo de alarmas', 'SEGURIDAD'),
  ('Cercos eléctricos y concertinas', 'SEGURIDAD'),
  ('Rejas y protecciones', 'SEGURIDAD'),
  ('Porteros y control de acceso', 'SEGURIDAD')
-- Por si el admin ya cargó alguno a mano desde el panel antes del deploy.
ON CONFLICT ("nombre") DO NOTHING;
