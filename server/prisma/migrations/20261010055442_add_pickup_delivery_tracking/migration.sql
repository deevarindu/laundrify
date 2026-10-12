
ALTER TABLE "PickupDeliveryRequest"
ADD COLUMN "requestCode" TEXT,
ADD COLUMN "scheduledDate" TIMESTAMP(3),
ADD COLUMN "scheduledEndTime" TEXT,
ADD COLUMN "scheduledStartTime" TEXT,
ADD COLUMN "serviceId" INTEGER;

UPDATE "PickupDeliveryRequest"
SET "requestCode" = 'LEGACY-' || "id"::TEXT
WHERE "requestCode" IS NULL;

WITH placeholder AS (
  INSERT INTO "Service" (
    "name",
    "category",
    "unit",
    "price",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'Layanan lama (tidak diketahui)',
    'REGULER'::"ServiceCategory",
    'KG'::"ServiceUnit",
    0,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  WHERE EXISTS (
    SELECT 1
    FROM "PickupDeliveryRequest"
    WHERE "serviceId" IS NULL
  )
  RETURNING "id"
)
UPDATE "PickupDeliveryRequest" AS request
SET "serviceId" = placeholder."id"
FROM placeholder
WHERE request."serviceId" IS NULL;

ALTER TABLE "PickupDeliveryRequest"
ALTER COLUMN "requestCode" SET NOT NULL,
ALTER COLUMN "serviceId" SET NOT NULL;

CREATE UNIQUE INDEX "PickupDeliveryRequest_requestCode_key"
ON "PickupDeliveryRequest"("requestCode");

ALTER TABLE "PickupDeliveryRequest"
ADD CONSTRAINT "PickupDeliveryRequest_serviceId_fkey"
FOREIGN KEY ("serviceId")
REFERENCES "Service"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;