import { prisma } from "./prisma";
import { applyMarkup, MARKUP_RATE, SPEND_CHARGE_THRESHOLD_CENTS } from "./metrics";
import { createSpendCharge } from "./stripe";
import { format, startOfMonth } from "date-fns";

/**
 * Check if a client account has accumulated enough marked-up spend
 * to trigger a new $300 threshold charge.
 *
 * Flow:
 * 1. Sum all daily costMicros for the current month
 * 2. Apply 15% markup to get the client-facing total
 * 3. Sum all successful/pending charges already created this month
 * 4. If (markedUpTotal - alreadyCharged) >= $300, create a new charge
 * 5. Repeat until remaining < $300 (handles catching up on multiple thresholds)
 */
export async function checkAndChargeSpendThreshold(
  clientAccountId: string
): Promise<{ chargesCreated: number; totalCharged: number }> {
  const account = await prisma.clientAccount.findUnique({
    where: { id: clientAccountId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  // Can't charge without Stripe
  if (!account?.stripeCustomerId || !account?.stripeSubscriptionId) {
    return { chargesCreated: 0, totalCharged: 0 };
  }

  const monthStart = startOfMonth(new Date());

  // Get all daily metrics for current month
  const dailyMetrics = await prisma.dailyMetrics.findMany({
    where: {
      clientAccountId,
      date: { gte: monthStart },
    },
    select: { costMicros: true },
  });

  // Calculate total marked-up spend for the month (in cents)
  const totalMarkedUpCents = dailyMetrics.reduce((sum, m) => {
    const { totalCents } = applyMarkup(m.costMicros);
    return sum + totalCents;
  }, 0);

  // Get total already charged this month (SUCCEEDED or PENDING)
  const existingCharges = await prisma.spendCharge.findMany({
    where: {
      clientAccountId,
      createdAt: { gte: monthStart },
      status: { in: ["SUCCEEDED", "PENDING"] },
    },
    select: { amountCents: true },
  });

  const totalAlreadyChargedCents = existingCharges.reduce(
    (sum, c) => sum + c.amountCents,
    0
  );

  // How much uncharged spend remains?
  let unchargedCents = totalMarkedUpCents - totalAlreadyChargedCents;
  let chargesCreated = 0;
  let totalNewlyCharged = 0;

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");

  // Create charges for each $300 threshold crossed
  while (unchargedCents >= SPEND_CHARGE_THRESHOLD_CENTS) {
    const chargeAmountCents = SPEND_CHARGE_THRESHOLD_CENTS;

    // Calculate raw vs markup split for this charge
    const rawCents = Math.round(chargeAmountCents / (1 + MARKUP_RATE));
    const markupCents = chargeAmountCents - rawCents;

    try {
      // Create charge in Stripe
      const result = await createSpendCharge({
        stripeCustomerId: account.stripeCustomerId,
        amountCents: chargeAmountCents,
        clientAccountId,
        periodStart: monthStartStr,
        periodEnd: today,
      });

      // Record in database
      await prisma.spendCharge.create({
        data: {
          clientAccountId,
          amountCents: chargeAmountCents,
          rawSpendCents: rawCents,
          markupCents,
          stripePaymentIntentId: result.paymentIntentId,
          status: result.status === "succeeded" ? "SUCCEEDED" : "PENDING",
          periodStart: monthStart,
          periodEnd: new Date(),
        },
      });

      chargesCreated++;
      totalNewlyCharged += chargeAmountCents;
      unchargedCents -= chargeAmountCents;
    } catch (error: any) {
      console.error(
        `Failed to create spend charge for ${clientAccountId}:`,
        error.message
      );

      // Record the failed charge
      await prisma.spendCharge.create({
        data: {
          clientAccountId,
          amountCents: chargeAmountCents,
          rawSpendCents: rawCents,
          markupCents,
          status: "FAILED",
          periodStart: monthStart,
          periodEnd: new Date(),
        },
      });

      // Create alert
      await prisma.alert.create({
        data: {
          clientAccountId,
          severity: "CRITICAL",
          title: "Ad spend charge failed",
          message: `Failed to charge $${(chargeAmountCents / 100).toFixed(2)} for accumulated ad spend. Error: ${error.message}`,
          category: "billing",
        },
      });

      // Stop trying to create more charges if payment fails
      break;
    }
  }

  return {
    chargesCreated,
    totalCharged: totalNewlyCharged / 100, // return in dollars
  };
}
