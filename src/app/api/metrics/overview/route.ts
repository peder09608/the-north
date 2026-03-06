import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microsToDisplayDollars } from "@/lib/metrics";
import { getDateRange, getPreviousPeriod, type DateRange } from "@/lib/dates";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = (request.nextUrl.searchParams.get("range") || "30d") as DateRange;
  const { start, end } = getDateRange(range);
  const prev = getPreviousPeriod(start, end);

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!clientAccount) {
    return NextResponse.json({ summary: null, daily: [] });
  }

  // Fetch current period metrics
  const currentMetrics = await prisma.dailyMetrics.findMany({
    where: {
      clientAccountId: clientAccount.id,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  // Fetch previous period for comparison
  const previousMetrics = await prisma.dailyMetrics.findMany({
    where: {
      clientAccountId: clientAccount.id,
      date: { gte: prev.start, lte: prev.end },
    },
  });

  if (currentMetrics.length === 0) {
    return NextResponse.json({ summary: null, daily: [] });
  }

  // Aggregate current period
  const current = aggregateMetrics(currentMetrics);
  const previous = aggregateMetrics(previousMetrics);

  // Calculate period-over-period changes
  const summary = {
    spend: microsToDisplayDollars(current.costMicros),
    clicks: current.clicks,
    impressions: current.impressions,
    ctr: current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0,
    conversions: current.conversions,
    cpa: current.conversions > 0 ? microsToDisplayDollars(current.costMicros) / current.conversions : 0,
    spendChange: calcChange(Number(current.costMicros), Number(previous.costMicros)),
    clicksChange: calcChange(current.clicks, previous.clicks),
    impressionsChange: calcChange(current.impressions, previous.impressions),
    ctrChange: calcChange(
      current.impressions > 0 ? current.clicks / current.impressions : 0,
      previous.impressions > 0 ? previous.clicks / previous.impressions : 0
    ),
    conversionsChange: calcChange(current.conversions, previous.conversions),
    cpaChange: calcChange(
      current.conversions > 0 ? Number(current.costMicros) / current.conversions : 0,
      previous.conversions > 0 ? Number(previous.costMicros) / previous.conversions : 0
    ),
  };

  // Daily data for chart
  const daily = currentMetrics.map((m) => ({
    date: format(m.date, "yyyy-MM-dd"),
    spend: microsToDisplayDollars(m.costMicros),
    clicks: m.clicks,
    impressions: m.impressions,
    conversions: m.conversions,
  }));

  return NextResponse.json({ summary, daily });
}

function aggregateMetrics(metrics: Array<{
  costMicros: bigint;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValue: number;
}>) {
  return metrics.reduce(
    (acc, m) => ({
      costMicros: acc.costMicros + m.costMicros,
      clicks: acc.clicks + m.clicks,
      impressions: acc.impressions + m.impressions,
      conversions: acc.conversions + m.conversions,
      conversionValue: acc.conversionValue + m.conversionValue,
    }),
    {
      costMicros: BigInt(0),
      clicks: 0,
      impressions: 0,
      conversions: 0,
      conversionValue: 0,
    }
  );
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
