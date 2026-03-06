-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ONBOARDING', 'PENDING_SETUP', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChangeRequestType" AS ENUM ('KEYWORD_ADDITION', 'KEYWORD_REMOVAL', 'AD_COPY_CHANGE', 'BUDGET_CHANGE', 'TARGETING_CHANGE', 'NEW_CAMPAIGN', 'PAUSE_CAMPAIGN', 'OTHER');

-- CreateEnum
CREATE TYPE "SpendChargeStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ONBOARDING',
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleAdsCustomerId" TEXT,
    "googleAdsAccountName" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "monthlyBudget" DOUBLE PRECISION,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_responses" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "businessName" TEXT,
    "websiteUrl" TEXT,
    "industry" TEXT,
    "industryOther" TEXT,
    "businessDescription" TEXT,
    "campaignGoals" TEXT[],
    "primaryGoal" TEXT,
    "monthlyLeadTarget" INTEGER,
    "targetingType" TEXT,
    "targetLocations" JSONB,
    "excludeLocations" JSONB,
    "targetKeywords" TEXT[],
    "negativeKeywords" TEXT[],
    "targetAudience" TEXT,
    "competitorNames" TEXT[],
    "monthlyBudget" DOUBLE PRECISION,
    "budgetFlexibility" TEXT,
    "uniqueSellingPoints" TEXT[],
    "callsToAction" TEXT[],
    "promotions" TEXT,
    "landingPageUrl" TEXT,
    "phoneNumber" TEXT,
    "businessAddress" TEXT,
    "previousAdExperience" TEXT,
    "additionalNotes" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "googleCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "dailyBudget" DOUBLE PRECISION,
    "targetLocations" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "costMicros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_daily_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "costMicros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geographic_metrics" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "locationType" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "costMicros" BIGINT NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geographic_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChangeRequestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spend_charges" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "rawSpendCents" INTEGER NOT NULL,
    "markupCents" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "SpendChargeStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spend_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "client_accounts_userId_key" ON "client_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_accounts_googleAdsCustomerId_key" ON "client_accounts"("googleAdsCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "client_accounts_stripeCustomerId_key" ON "client_accounts"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_responses_clientAccountId_key" ON "onboarding_responses"("clientAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_clientAccountId_googleCampaignId_key" ON "campaigns"("clientAccountId", "googleCampaignId");

-- CreateIndex
CREATE INDEX "daily_metrics_clientAccountId_date_idx" ON "daily_metrics"("clientAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_clientAccountId_date_key" ON "daily_metrics"("clientAccountId", "date");

-- CreateIndex
CREATE INDEX "campaign_daily_metrics_campaignId_date_idx" ON "campaign_daily_metrics"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_daily_metrics_campaignId_date_key" ON "campaign_daily_metrics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "geographic_metrics_clientAccountId_date_idx" ON "geographic_metrics"("clientAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "geographic_metrics_clientAccountId_date_locationId_key" ON "geographic_metrics"("clientAccountId", "date", "locationId");

-- CreateIndex
CREATE INDEX "change_requests_clientAccountId_status_idx" ON "change_requests"("clientAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "spend_charges_stripePaymentIntentId_key" ON "spend_charges"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "spend_charges_clientAccountId_createdAt_idx" ON "spend_charges"("clientAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "alerts_clientAccountId_isRead_idx" ON "alerts"("clientAccountId", "isRead");

-- AddForeignKey
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_responses" ADD CONSTRAINT "onboarding_responses_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_daily_metrics" ADD CONSTRAINT "campaign_daily_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spend_charges" ADD CONSTRAINT "spend_charges_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
