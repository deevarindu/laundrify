/*
  Warnings:

  - The values [SATUAN] on the enum `ServiceCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receivedById` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'DIKERINGKAN';

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceCategory_new" AS ENUM ('REGULER', 'EKSPRESS', 'KHUSUS');
ALTER TABLE "Service" ALTER COLUMN "category" TYPE "ServiceCategory_new" USING ("category"::text::"ServiceCategory_new");
ALTER TYPE "ServiceCategory" RENAME TO "ServiceCategory_old";
ALTER TYPE "ServiceCategory_new" RENAME TO "ServiceCategory";
DROP TYPE "public"."ServiceCategory_old";
COMMIT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "discountPercent" SET DEFAULT 10,
ALTER COLUMN "isActive" SET DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'BELUM_DIBAYAR',
ALTER COLUMN "discount" SET DEFAULT 0,
ALTER COLUMN "dueAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receivedById" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "isActive" SET DEFAULT true;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
