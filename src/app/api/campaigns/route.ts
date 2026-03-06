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

  const campaigns = await prisma.campaign.findMany({
    where: { clientAccountId: clientAccount.id },
    include: {
      campaignMetrics: {
        where: { date: { gte: start, lte: end } },
      },
    },
  });

  const result = campaigns.map((campaign) => {
    const totalCostMicros = campaign.campaignMetrics.reduce(
      (sum, m) => sum + m.costMicros,
      BigInt(0)
    );
    const totalClicks = campaign.campaignMetrics.reduce(
      (sum, m) => sum + m.clicks,
      0
    );
    const totalImpressions = campaign.campaignMetrics.reduce(
      (sum, m) => sum + m.impressions,
      0
    );
    const totalConversions = campaign.campaignMetrics.reduce(
      (sum, m) => sum + m.conversions,
      0
    );
    const spend = microsToDisplayDollars(totalCostMicros);

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      spend,
      clicks: totalClicks,
      impressions: totalImpressions,
      conversions: totalConversions,
      cpa: totalConversions > 0 ? spend / totalConversions : 0,
    };
  });

  return NextResponse.json(result);
}
