import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchDailyMetrics,
  fetchAccountDailyMetrics,
  fetchGeographicMetrics,
  listCampaigns,
} from "@/lib/google-ads";
import { format, subDays } from "date-fns";

/**
 * POST /api/admin/clients/[id]/sync
 *
 * Pulls the latest metrics from Google Ads for a specific client account:
 * 1. Syncs campaign list (creates any new campaigns in DB)
 * 2. Syncs daily account-level metrics (last 3 days)
 * 3. Syncs daily campaign-level metrics (last 3 days)
 * 4. Syncs geographic metrics (last 3 days)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const account = await prisma.clientAccount.findUnique({
    where: { id },
    include: { campaigns: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (!account.googleAdsCustomerId) {
    return NextResponse.json(
      { error: "No Google Ads account linked" },
      { status: 400 }
    );
  }

  const customerId = account.googleAdsCustomerId;

  // Sync last 3 days to catch any delayed conversions
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 3), "yyyy-MM-dd");

  const stats = {
    campaignsSynced: 0,
    dailyMetricsUpserted: 0,
    campaignMetricsUpserted: 0,
    geoMetricsUpserted: 0,
  };

  try {
    // Step 1: Sync campaign list from Google Ads
    const googleCampaigns = await listCampaigns(customerId);

    for (const gc of googleCampaigns) {
      await prisma.campaign.upsert({
        where: {
          clientAccountId_googleCampaignId: {
            clientAccountId: id,
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
          clientAccountId: id,
          googleCampaignId: gc.id,
          name: gc.name,
          status: gc.status,
          campaignType: gc.channelType,
          lastSyncedAt: new Date(),
        },
      });
      stats.campaignsSynced++;
    }

    // Step 2: Sync account-level daily metrics
    const accountMetrics = await fetchAccountDailyMetrics(
      customerId,
      startDate,
      endDate
    );

    for (const row of accountMetrics) {
      const date = new Date(row.date + "T00:00:00Z");

      await prisma.dailyMetrics.upsert({
        where: {
          clientAccountId_date: {
            clientAccountId: id,
            date,
          },
        },
        update: {
          impressions: row.impressions,
          clicks: row.clicks,
          costMicros: row.costMicros,
          conversions: row.conversions,
          conversionValue: row.conversionValue,
        },
        create: {
          clientAccountId: id,
          date,
          impressions: row.impressions,
          clicks: row.clicks,
          costMicros: row.costMicros,
          conversions: row.conversions,
          conversionValue: row.conversionValue,
        },
      });
      stats.dailyMetricsUpserted++;
    }

    // Step 3: Sync campaign-level daily metrics
    const campaignMetrics = await fetchDailyMetrics(
      customerId,
      startDate,
      endDate
    );

    // Build a map from Google campaign ID → DB campaign ID
    const dbCampaigns = await prisma.campaign.findMany({
      where: { clientAccountId: id },
      select: { id: true, googleCampaignId: true },
    });
    const campaignMap = new Map(
      dbCampaigns.map((c) => [c.googleCampaignId, c.id])
    );

    for (const row of campaignMetrics) {
      const dbCampaignId = campaignMap.get(row.campaignId);
      if (!dbCampaignId) continue; // skip if campaign not in DB yet

      const date = new Date(row.date + "T00:00:00Z");

      await prisma.campaignDailyMetrics.upsert({
        where: {
          campaignId_date: {
            campaignId: dbCampaignId,
            date,
          },
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
      stats.campaignMetricsUpserted++;
    }

    // Step 4: Sync geographic metrics
    try {
      const geoMetrics = await fetchGeographicMetrics(
        customerId,
        startDate,
        endDate
      );

      for (const row of geoMetrics) {
        const date = new Date(row.date + "T00:00:00Z");
        const locationId = row.cityName.replace(/\s+/g, "_").toLowerCase();

        await prisma.geographicMetrics.upsert({
          where: {
            clientAccountId_date_locationId: {
              clientAccountId: id,
              date,
              locationId,
            },
          },
          update: {
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            conversions: row.conversions,
          },
          create: {
            clientAccountId: id,
            date,
            locationType: row.locationType,
            locationName: row.cityName,
            locationId,
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            conversions: row.conversions,
          },
        });
        stats.geoMetricsUpserted++;
      }
    } catch (geoError: any) {
      // Geographic metrics may not be available for all accounts
      console.warn("Geographic metrics sync warning:", geoError.message);
    }

    return NextResponse.json({
      success: true,
      synced: stats,
      dateRange: { startDate, endDate },
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: "Metrics sync failed",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
