import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createStripeCustomer,
  createSubscriptionCheckout,
} from "@/lib/stripe";

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for the $99/month subscription.
 * If the client doesn't have a Stripe customer yet, creates one first.
 *
 * Accepts optional body: { returnContext: "onboarding" }
 * to redirect back to onboarding success page instead of dashboard.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });

  if (!account) {
    return NextResponse.json(
      { error: "No client account found" },
      { status: 404 }
    );
  }

  // Already has an active subscription?
  if (account.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "You already have an active subscription" },
      { status: 400 }
    );
  }

  // Parse optional body for return context
  let returnContext: string | undefined;
  try {
    const body = await request.json();
    returnContext = body.returnContext;
  } catch {
    // No body or invalid JSON — that's fine
  }

  try {
    // Create Stripe customer if needed
    let stripeCustomerId = account.stripeCustomerId;

    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomer({
        email: account.user.email,
        name: account.user.name || undefined,
        metadata: { clientAccountId: account.id },
      });

      await prisma.clientAccount.update({
        where: { id: account.id },
        data: { stripeCustomerId },
      });
    }

    // Create Checkout session with appropriate return URLs
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const isOnboarding = returnContext === "onboarding";
    const successUrl = isOnboarding
      ? `${baseUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = isOnboarding
      ? `${baseUrl}/onboarding/review`
      : `${baseUrl}/dashboard/billing`;

    const checkoutUrl = await createSubscriptionCheckout({
      stripeCustomerId,
      clientAccountId: account.id,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
