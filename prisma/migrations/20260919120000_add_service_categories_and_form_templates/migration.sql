-- Adds admin-customizable service categories (with sub-services) and an
-- admin-editable consultation form builder (FormTemplate/FormField), then
-- wires Service -> ServiceCategory and Form -> FormTemplate.
--
-- Written to be safe against the existing production data in Neon:
--   1. New tables are created first (nothing references them yet, so
--      existing rows are untouched).
--   2. Four starter categories are seeded, including a non-destructive
--      "Other Services" bucket.
--   3. Service.categoryId is added NULLABLE, backfilled to "Other
--      Services" for every existing row, and only THEN made NOT NULL —
--      so this migration can never fail (or drop rows) because of
--      services that already exist in production.
--   4. Form.formTemplateId is added nullable/optional throughout — every
--      existing Form row (consent/intake submissions already on file)
--      keeps working unchanged.
--
-- Apply with: npx prisma migrate deploy  (against the production
-- DATABASE_URL) — never `migrate dev` against production.

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SINGLE_SELECT', 'MULTI_SELECT', 'SCALE', 'DATE', 'CHECKBOX', 'SIGNATURE');

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" SERIAL NOT NULL,
    "formTemplateId" INTEGER NOT NULL,
    "section" TEXT,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "fieldType" "FormFieldType" NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "formTemplateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormField_formTemplateId_order_idx" ON "FormField"("formTemplateId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_formTemplateId_idx" ON "ServiceCategory"("formTemplateId");

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the four starter categories the business actually asked for.
-- "Other Services" is the non-destructive landing zone for every service
-- that already exists in production — nothing is reassigned into "Starter
-- Locs" automatically, since only an admin should decide that mapping.
INSERT INTO "ServiceCategory" ("name", "slug", "description", "displayOrder", "isActive", "updatedAt") VALUES
    ('Starter Locs', 'starter-locs', 'New loc installations and starter systems.', 1, true, CURRENT_TIMESTAMP),
    ('Locs Styling', 'locs-styling', 'Styling services for established locs.', 2, true, CURRENT_TIMESTAMP),
    ('Retie Services', 'retie-services', 'Retie and maintenance services for existing locs.', 3, true, CURRENT_TIMESTAMP),
    ('Other Services', 'other-services', 'Everything not yet sorted into a category.', 99, true, CURRENT_TIMESTAMP);

-- AlterTable: add Service.categoryId NULLABLE first so this migration can
-- never fail against rows that already exist in production.
ALTER TABLE "Service" ADD COLUMN "categoryId" INTEGER;
ALTER TABLE "Service" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: every pre-existing service lands in "Other Services" — an
-- admin can then recategorize each one from the new admin UI.
UPDATE "Service" SET "categoryId" = (SELECT "id" FROM "ServiceCategory" WHERE "slug" = 'other-services');

-- Now that every row has a value, the column can be safely required.
ALTER TABLE "Service" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Form gains an optional link back to the FormTemplate it was
-- submitted from. Existing consent/intake-era Form rows are untouched.
ALTER TABLE "Form" ADD COLUMN "formTemplateId" INTEGER;

-- CreateIndex
CREATE INDEX "Form_formTemplateId_idx" ON "Form"("formTemplateId");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
