import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchDailyMetrics,
  fetchAccountDailyMetrics,
  listCampaigns,
} from "@/lib/google-ads";
import { checkAndChargeSpendThreshold } from "@/lib/billing";
import { format, subDays } from "date-fns";

/**
 * GET /api/cron/sync-metrics
 *
 * Called by Vercel Cron (or manually by admin) to sync metrics
 * for all active client accounts that have a Google Ads ID.
 *
 * Protected by CRON_SECRET header check in production.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Find all active accounts with a Google Ads customer ID
  const accounts = await prisma.clientAccount.findMany({
    where: {
      googleAdsCustomerId: { not: null },
      user: { status: { in: ["ACTIVE", "PAUSED"] } },
    },
    select: {
      id: true,
      googleAdsCustomerId: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (accounts.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No accounts to sync",
      results: [],
    });
  }

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 3), "yyyy-MM-dd");

  const results: Array<{
    accountId: string;
    email: string;
    status: "success" | "error";
    stats?: Record<string, number>;
    error?: string;
  }> = [];

  for (const account of accounts) {
    const customerId = account.googleAdsCustomerId!;

    try {
      let campaignsSynced = 0;
      let dailyMetricsUpserted = 0;
      let campaignMetricsUpserted = 0;

      // 1. Sync campaign list
      const googleCampaigns = await listCampaigns(customerId);
      for (const gc of googleCampaigns) {
        await prisma.campaign.upsert({
          where: {
            clientAccountId_googleCampaignId: {
              clientAccountId: account.id,
              googleCampaignId: gc.id,
            },
          },
          update: {
            name: gc.name,
            status: gc.status,
            campaignType: gc.channelType,
            lastSyncedAt: new Date(),
          },
          create: {
            clientAccountId: account.id,
            googleCampaignId: gc.id,
            name: gc.name,
            status: gc.status,
            campaignType: gc.channelType,
            lastSyncedAt: new Date(),
          },
        });
        campaignsSynced++;
      }

      // 2. Sync account-level daily metrics
      const accountMetrics = await fetchAccountDailyMetrics(
        customerId,
        startDate,
        endDate
      );
      for (const row of accountMetrics) {
        const date = new Date(row.date + "T00:00:00Z");
        await prisma.dailyMetrics.upsert({
          where: {
            clientAccountId_date: { clientAccountId: account.id, date },
          },
          update: {
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            conversions: row.conversions,
            conversionValue: row.conversionValue,
          },
          create: {
            clientAccountId: account.id,
            date,
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            conversions: row.conversions,
            conversionValue: row.conversionValue,
          },
        });
        dailyMetricsUpserted++;
      }

      // 3. Sync campaign-level metrics
      const campaignMetrics = await fetchDailyMetrics(
        customerId,
        startDate,
        endDate
      );
      const dbCampaigns = await prisma.campaign.findMany({
        where: { clientAccountId: account.id },
        select: { id: true, googleCampaignId: true },
      });
      const campaignMap = new Map(
        dbCampaigns.map((c) => [c.googleCampaignId, c.id])
      );

      for (const row of campaignMetrics) {
        const dbCampaignId = campaignMap.get(row.campaignId);
        if (!dbCampaignId) continue;
        const date = new Date(row.date + "T00:00:00Z");

        await prisma.campaignDailyMetrics.upsert({
          where: {
            campaignId_date: { campaignId: dbCampaignId, date },
          },
          update: {
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            conversions: row.conversions,
            conversionValue: row.conversionValue,
          },
          create: {
            campaignId: dbCampaignId,
            date,
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            conversions: row.conversions,
            conversionValue: row.conversionValue,
          },
        });
        campaignMetricsUpserted++;
      }

      // 4. Check spend thresholds and charge if needed
      let spendChargesCreated = 0;
      try {
        const billingResult = await checkAndChargeSpendThreshold(account.id);
        spendChargesCreated = billingResult.chargesCreated;
      } catch (billingError: any) {
        console.error(
          `Billing check error for ${account.id}:`,
          billingError.message
        );
      }

      results.push({
        accountId: account.id,
        email: account.user.email,
        status: "success",
        stats: {
          campaignsSynced,
          dailyMetricsUpserted,
          campaignMetricsUpserted,
          spendChargesCreated,
        },
      });
    } catch (error: any) {
      console.error(
        `Sync error for account ${account.id} (${account.user.email}):`,
        error.message
      );
      results.push({
        accountId: account.id,
        email: account.user.email,
        status: "error",
        error: error.message || String(error),
      });
    }
  }

  return NextResponse.json({
    success: true,
    totalAccounts: accounts.length,
    successful: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "error").length,
    dateRange: { startDate, endDate },
    results,
  });
}
