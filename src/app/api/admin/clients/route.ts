import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microsToDisplayDollars } from "@/lib/metrics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const accounts = await prisma.clientAccount.findMany({
    include: {
      user: { select: { id: true, email: true, name: true, status: true, createdAt: true } },
      onboarding: { select: { businessName: true, industry: true } },
      dailyMetrics: {
        where: {
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      _count: {
        select: {
          changeRequests: { where: { status: "PENDING" } },
          campaigns: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const clients = accounts.map((account) => {
    const totalCostMicros = account.dailyMetrics.reduce(
      (sum, m) => sum + m.costMicros,
      BigInt(0)
    );

    return {
      id: account.id,
      userId: account.user.id,
      email: account.user.email,
      name: account.user.name,
      businessName: account.onboarding?.businessName || null,
      industry: account.onboarding?.industry || null,
      status: account.user.status,
      googleAdsCustomerId: account.googleAdsCustomerId,
      monthlyBudget: account.monthlyBudget,
      isPaused: account.isPaused,
      spend30d: microsToDisplayDollars(totalCostMicros),
      pendingRequests: account._count.changeRequests,
      campaignCount: account._count.campaigns,
      createdAt: account.user.createdAt,
    };
  });

  return NextResponse.json(clients);
}
