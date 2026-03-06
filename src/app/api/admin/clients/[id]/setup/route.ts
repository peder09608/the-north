import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createChildAccount,
  createSearchCampaign,
} from "@/lib/google-ads";
import { createStripeCustomer } from "@/lib/stripe";

/**
 * POST /api/admin/clients/[id]/setup
 *
 * Triggered by admin to set up a client's Google Ads account:
 * 1. Creates a sub-account under the MCC
 * 2. Creates a search campaign from onboarding data
 * 3. Updates the client account status to ACTIVE
 */
export async function POST(
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
      user: true,
      onboarding: true,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (!account.onboarding?.completedAt) {
    return NextResponse.json(
      { error: "Onboarding not completed" },
      { status: 400 }
    );
  }

  const ob = account.onboarding;

  try {
    // Step 1: Create Google Ads sub-account (skip if already has one)
    let customerId = account.googleAdsCustomerId;

    if (!customerId) {
      customerId = await createChildAccount({
        businessName: ob.businessName || account.user.name || "New Account",
      });

      await prisma.clientAccount.update({
        where: { id },
        data: {
          googleAdsCustomerId: customerId,
          googleAdsAccountName: ob.businessName,
        },
      });
    }

    // Step 2: Build campaign from onboarding data
    const monthlyBudget = ob.monthlyBudget || 1000;
    const dailyBudget = Math.round((monthlyBudget / 30.4) * 100) / 100; // ~monthly/30.4

    // Build headlines from USPs and business name
    const headlines: string[] = [];
    if (ob.businessName) headlines.push(ob.businessName.slice(0, 30));
    for (const usp of ob.uniqueSellingPoints || []) {
      if (headlines.length < 15) headlines.push(usp.slice(0, 30));
    }
    // Add CTA-based headlines
    const ctaMap: Record<string, string> = {
      call_now: "Call Now - Free Quote",
      get_quote: "Get a Free Quote Today",
      book_consultation: "Book a Consultation",
      learn_more: "Learn More Today",
      sign_up: "Sign Up Now",
      shop_now: "Shop Now - Great Deals",
      contact_us: "Contact Us Today",
    };
    for (const cta of ob.callsToAction || []) {
      if (headlines.length < 15 && ctaMap[cta]) {
        headlines.push(ctaMap[cta]);
      }
    }

    // Build descriptions
    const descriptions: string[] = [];
    if (ob.businessDescription) {
      descriptions.push(ob.businessDescription.slice(0, 90));
    }
    if (ob.promotions) {
      descriptions.push(ob.promotions.slice(0, 90));
    }
    for (const usp of ob.uniqueSellingPoints || []) {
      if (descriptions.length < 4) {
        descriptions.push(usp.slice(0, 90));
      }
    }

    const campaignResult = await createSearchCampaign({
      customerId,
      campaignName: `${ob.businessName || "Main"} - Search`,
      dailyBudgetDollars: dailyBudget,
      keywords: ob.targetKeywords || [],
      negativeKeywords: ob.negativeKeywords || [],
      headlines,
      descriptions,
      finalUrl: ob.landingPageUrl || ob.websiteUrl || "https://example.com",
      phoneNumber: ob.phoneNumber || undefined,
    });

    // Step 3: Save campaign to database
    await prisma.campaign.create({
      data: {
        clientAccountId: id,
        googleCampaignId: campaignResult.campaignId,
        name: `${ob.businessName || "Main"} - Search`,
        status: "PAUSED",
        campaignType: "SEARCH",
        dailyBudget,
        targetLocations: (ob.targetLocations as any) || undefined,
      },
    });

    // Step 4: Create Stripe customer (skip if already has one)
    let stripeCustomerId = account.stripeCustomerId;
    if (!stripeCustomerId) {
      try {
        stripeCustomerId = await createStripeCustomer({
          email: account.user.email,
          name: ob.businessName || account.user.name || undefined,
          metadata: {
            clientAccountId: id,
            googleAdsCustomerId: customerId,
          },
        });
      } catch (stripeError: any) {
        console.warn("Stripe customer creation failed:", stripeError.message);
        // Non-fatal — admin can link manually later
      }
    }

    // Step 5: Update client status to ACTIVE
    await prisma.user.update({
      where: { id: account.userId },
      data: { status: "ACTIVE" },
    });

    await prisma.clientAccount.update({
      where: { id },
      data: {
        monthlyBudget,
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      customerId,
      campaignId: campaignResult.campaignId,
      stripeCustomerId: stripeCustomerId || null,
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
