-- Adds admin-uploaded photos for Services and ServiceCategories.
--
-- Purely additive and safe against production data in Neon:
--   * one new table (ServiceImage)
--   * two NULLABLE columns (Service.imageId, ServiceCategory.imageId), so
--     every existing row is valid as-is and simply shows a placeholder in
--     the UI until an admin uploads a photo
--   * FKs use ON DELETE SET NULL so removing an image row can never delete
--     or block a service/category
--
-- Apply with: npx prisma migrate deploy

-- CreateTable
CREATE TABLE "ServiceImage" (
    "id" SERIAL NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "imageId" INTEGER;

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN "imageId" INTEGER;

-- CreateIndex
CREATE INDEX "Service_imageId_idx" ON "Service"("imageId");

-- CreateIndex
CREATE INDEX "ServiceCategory_imageId_idx" ON "ServiceCategory"("imageId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ServiceImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ServiceImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
