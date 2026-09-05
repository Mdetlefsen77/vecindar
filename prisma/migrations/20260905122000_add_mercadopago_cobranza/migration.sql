-- AlterTable
ALTER TABLE "suscripciones" ADD COLUMN     "mpPreapprovalId" TEXT,
ADD COLUMN     "mpPreapprovalEstado" TEXT;

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "mpPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_mpPreapprovalId_key" ON "suscripciones"("mpPreapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_mpPaymentId_key" ON "pagos"("mpPaymentId");
