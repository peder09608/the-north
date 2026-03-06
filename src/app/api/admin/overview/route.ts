import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microsToDisplayDollars, microsToRawDollars } from "@/lib/metrics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [
    totalClients,
    activeClients,
    pendingSetupClients,
    pendingRequests,
    recentMetrics,
    recentCharges,
  ] = await Promise.all([
    prisma.clientAccount.count(),
    prisma.user.count({ where: { role: "CLIENT", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CLIENT", status: "PENDING_SETUP" } }),
    prisma.changeRequest.count({ where: { status: "PENDING" } }),
    prisma.dailyMetrics.findMany({
      where: {
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.spendCharge.findMany({
      where: {
        status: "SUCCEEDED",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const totalRawSpendMicros = recentMetrics.reduce(
    (sum, m) => sum + m.costMicros,
    BigInt(0)
  );
  const totalMarkedUpSpend = microsToDisplayDollars(totalRawSpendMicros);
  const totalRawSpend = microsToRawDollars(totalRawSpendMicros);
  const totalRevenue =
    recentCharges.reduce((sum, c) => sum + c.amountCents, 0) / 100;
  const totalMargin = totalMarkedUpSpend - totalRawSpend;

  return NextResponse.json({
    totalClients,
    activeClients,
    pendingSetupClients,
    pendingRequests,
    totalSpend30d: totalMarkedUpSpend,
    totalRevenue30d: totalRevenue,
    totalMargin30d: totalMargin,
  });
}
