import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microsToDisplayDollars } from "@/lib/metrics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      spendCharges: { orderBy: { createdAt: "desc" } },
      dailyMetrics: {
        where: {
          date: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ),
          },
        },
      },
    },
  });

  if (!clientAccount) {
    return NextResponse.json({
      currentMonthSpend: 0,
      charges: [],
      accumulatedUncharged: 0,
    });
  }

  // Calculate current month's marked-up spend
  const currentMonthCostMicros = clientAccount.dailyMetrics.reduce(
    (sum, m) => sum + m.costMicros,
    BigInt(0)
  );
  const currentMonthSpend = microsToDisplayDollars(currentMonthCostMicros);

  // Calculate accumulated uncharged spend this month
  const thisMonthCharges = clientAccount.spendCharges.filter(
    (c) =>
      c.status === "SUCCEEDED" &&
      c.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const totalChargedThisMonth =
    thisMonthCharges.reduce((sum, c) => sum + c.amountCents, 0) / 100;
  const accumulatedUncharged = Math.max(
    0,
    currentMonthSpend - totalChargedThisMonth
  );

  return NextResponse.json({
    currentMonthSpend,
    accumulatedUncharged,
    nextChargeAt: 300 - (accumulatedUncharged % 300),
    hasSubscription: !!clientAccount.stripeSubscriptionId,
    hasPaymentMethod: !!clientAccount.stripeCustomerId,
    charges: clientAccount.spendCharges.map((c) => ({
      id: c.id,
      amountCents: c.amountCents,
      status: c.status,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      createdAt: c.createdAt,
    })),
  });
}
