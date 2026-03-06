import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microsToDisplayDollars, microsToRawDollars } from "@/lib/metrics";

export async function GET(
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
    include: {
      user: { select: { id: true, email: true, name: true, status: true, createdAt: true } },
      onboarding: true,
      campaigns: {
        include: {
          campaignMetrics: {
            where: {
              date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      },
      dailyMetrics: {
        where: {
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "asc" },
      },
      changeRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      spendCharges: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      alerts: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalCostMicros = account.dailyMetrics.reduce(
    (sum, m) => sum + m.costMicros,
    BigInt(0)
  );

  const campaigns = account.campaigns.map((c) => {
    const cost = c.campaignMetrics.reduce((s, m) => s + m.costMicros, BigInt(0));
    const clicks = c.campaignMetrics.reduce((s, m) => s + m.clicks, 0);
    const conversions = c.campaignMetrics.reduce((s, m) => s + m.conversions, 0);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      type: c.campaignType,
      googleCampaignId: c.googleCampaignId,
      spend: microsToDisplayDollars(cost),
      rawSpend: microsToRawDollars(cost),
      clicks,
      conversions,
    };
  });

  return NextResponse.json({
    id: account.id,
    user: account.user,
    googleAdsCustomerId: account.googleAdsCustomerId,
    stripeCustomerId: account.stripeCustomerId,
    gtmPublicId: account.gtmPublicId,
    monthlyBudget: account.monthlyBudget,
    isPaused: account.isPaused,
    onboarding: account.onboarding,
    campaigns,
    spend30d: microsToDisplayDollars(totalCostMicros),
    rawSpend30d: microsToRawDollars(totalCostMicros),
    changeRequests: account.changeRequests,
    spendCharges: account.spendCharges,
    alerts: account.alerts,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Allow updating status, Google Ads customer ID, etc.
  const account = await prisma.clientAccount.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.status) {
    await prisma.user.update({
      where: { id: account.userId },
      data: { status: body.status },
    });
  }

  if (body.googleAdsCustomerId !== undefined) {
    await prisma.clientAccount.update({
      where: { id },
      data: { googleAdsCustomerId: body.googleAdsCustomerId },
    });
  }

  return NextResponse.json({ success: true });
}
