-- CreateTable
CREATE TABLE "admission_lead_popup" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "delaySeconds" INTEGER NOT NULL DEFAULT 15,
    "heading" TEXT NOT NULL DEFAULT 'Start your journey with Sonargaon University',
    "subheading" TEXT NOT NULL DEFAULT 'Get personalized admission guidance from our admission team.',
    "buttonText" TEXT NOT NULL DEFAULT 'Get admission guidance',
    "successMessage" TEXT NOT NULL DEFAULT 'Our admission team will contact you shortly.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_lead_popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "programmeName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admission_lead_status_submittedAt_idx" ON "admission_lead"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "admission_lead_submittedAt_idx" ON "admission_lead"("submittedAt");
