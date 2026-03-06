import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPortalSession } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session so clients can
 * manage their payment methods, view invoices, and cancel.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!account?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 404 }
    );
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portalUrl = await createPortalSession({
      stripeCustomerId: account.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
