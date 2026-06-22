-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "hairType" TEXT,
    "scalpCondition" TEXT,
    "productPreference" TEXT,
    "visitReason" TEXT,
    "lastChemicalTreatment" TEXT,
    "currentProducts" TEXT,
    "goals" TEXT,
    "allergies" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentForm" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "signature" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentForm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
