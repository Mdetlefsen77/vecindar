-- Seguimiento de uso de la cuenta para cobranza / actividad.
-- Ambas columnas son nullable: las cuentas existentes arrancan sin dato y se
-- van completando (ultimoLoginAt en el próximo login, ultimaActividadAt en el
-- próximo request autenticado).
ALTER TABLE "usuarios" ADD COLUMN "ultimoLoginAt" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN "ultimaActividadAt" TIMESTAMP(3);

-- Índice para los filtros/orden por actividad en el panel de admin.
CREATE INDEX "usuarios_ultimaActividadAt_idx" ON "usuarios"("ultimaActividadAt");
