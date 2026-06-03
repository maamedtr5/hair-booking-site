-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderCron" TEXT;
