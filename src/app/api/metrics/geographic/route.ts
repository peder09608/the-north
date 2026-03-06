import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microsToDisplayDollars } from "@/lib/metrics";
import { getDateRange, type DateRange } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = (request.nextUrl.searchParams.get("range") || "30d") as DateRange;
  const { start, end } = getDateRange(range);

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!clientAccount) {
    return NextResponse.json([]);
  }

  const metrics = await prisma.geographicMetrics.findMany({
    where: {
      clientAccountId: clientAccount.id,
      date: { gte: start, lte: end },
    },
  });

  // Aggregate by location
  const locationMap = new Map<
    string,
    {
      locationName: string;
      locationType: string;
      impressions: number;
      clicks: number;
      costMicros: bigint;
      conversions: number;
    }
  >();

  for (const m of metrics) {
    const key = m.locationName;
    const existing = locationMap.get(key);
    if (existing) {
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.costMicros += m.costMicros;
      existing.conversions += m.conversions;
    } else {
      locationMap.set(key, {
        locationName: m.locationName,
        locationType: m.locationType,
        impressions: m.impressions,
        clicks: m.clicks,
        costMicros: m.costMicros,
        conversions: m.conversions,
      });
    }
  }

  const result = Array.from(locationMap.values())
    .map((loc) => ({
      locationName: loc.locationName,
      locationType: loc.locationType,
      impressions: loc.impressions,
      clicks: loc.clicks,
      spend: microsToDisplayDollars(loc.costMicros),
      conversions: loc.conversions,
      ctr: loc.impressions > 0 ? (loc.clicks / loc.impressions) * 100 : 0,
      cpa:
        loc.conversions > 0
          ? microsToDisplayDollars(loc.costMicros) / loc.conversions
          : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  return NextResponse.json(result);
}
