/*
  Warnings:

  - A unique constraint covering the columns `[pickupDeliveryRequestId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pickupDeliveryRequestId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Order_pickupDeliveryRequestId_key" ON "Order"("pickupDeliveryRequestId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupDeliveryRequestId_fkey" FOREIGN KEY ("pickupDeliveryRequestId") REFERENCES "PickupDeliveryRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
