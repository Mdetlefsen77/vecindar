-- CreateIndex
CREATE INDEX "alertas_panico_usuarioId_idx" ON "alertas_panico"("usuarioId");

-- CreateIndex
CREATE INDEX "alertas_panico_atendioPorId_idx" ON "alertas_panico"("atendioPorId");

-- CreateIndex
CREATE INDEX "comentarios_alertas_alertaId_idx" ON "comentarios_alertas"("alertaId");

-- CreateIndex
CREATE INDEX "comentarios_alertas_usuarioId_idx" ON "comentarios_alertas"("usuarioId");

-- CreateIndex
CREATE INDEX "comentarios_requerimientos_requerimientoId_idx" ON "comentarios_requerimientos"("requerimientoId");

-- CreateIndex
CREATE INDEX "comentarios_requerimientos_usuarioId_idx" ON "comentarios_requerimientos"("usuarioId");

-- CreateIndex
CREATE INDEX "incidentes_loteId_idx" ON "incidentes"("loteId");

-- CreateIndex
CREATE INDEX "incidentes_reportadoPorId_idx" ON "incidentes"("reportadoPorId");

-- CreateIndex
CREATE INDEX "incidentes_fechaHora_idx" ON "incidentes"("fechaHora");

-- CreateIndex
CREATE INDEX "mascotas_perdidas_usuarioId_idx" ON "mascotas_perdidas"("usuarioId");

-- CreateIndex
CREATE INDEX "pagos_registradoPorId_idx" ON "pagos"("registradoPorId");

-- CreateIndex
CREATE INDEX "push_subscriptions_usuarioId_idx" ON "push_subscriptions"("usuarioId");

-- CreateIndex
CREATE INDEX "requerimientos_usuarioId_idx" ON "requerimientos"("usuarioId");

-- CreateIndex
CREATE INDEX "residentes_loteId_idx" ON "residentes"("loteId");

-- CreateIndex
CREATE INDEX "usuarios_loteId_idx" ON "usuarios"("loteId");
