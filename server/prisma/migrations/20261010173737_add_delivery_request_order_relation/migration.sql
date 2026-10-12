/*
  Warnings:

  - A unique constraint covering the columns `[requestedForOrderId]` on the table `PickupDeliveryRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PickupDeliveryRequest" ADD COLUMN     "requestedForOrderId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PickupDeliveryRequest_requestedForOrderId_key" ON "PickupDeliveryRequest"("requestedForOrderId");

-- AddForeignKey
ALTER TABLE "PickupDeliveryRequest" ADD CONSTRAINT "PickupDeliveryRequest_requestedForOrderId_fkey" FOREIGN KEY ("requestedForOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
