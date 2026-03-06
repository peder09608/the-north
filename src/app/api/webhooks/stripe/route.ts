import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { provisionGtmContainer } from "@/lib/gtm";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed  → Save subscription ID
 * - invoice.payment_succeeded   → Log subscription payment
 * - invoice.payment_failed      → Alert admin
 * - payment_intent.succeeded    → Mark spend charge as SUCCEEDED
 * - payment_intent.payment_failed → Mark spend charge as FAILED + alert
 * - customer.subscription.deleted → Handle churn
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      default:
        // Unhandled event type — that's OK
        break;
    }
  } catch (error: any) {
    console.error(`Error handling webhook ${event.type}:`, error.message);
    // Return 200 anyway to prevent Stripe from retrying
    // We'll handle errors via alerts in the admin panel
  }

  return NextResponse.json({ received: true });
}

// ─── Event Handlers ─────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clientAccountId = session.metadata?.clientAccountId;
  if (!clientAccountId) return;

  const subscriptionId = session.subscription as string | null;

  if (subscriptionId) {
    await prisma.clientAccount.update({
      where: { id: clientAccountId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
      },
    });

    // Create a welcome alert
    await prisma.alert.create({
      data: {
        clientAccountId,
        severity: "INFO",
        title: "Subscription activated",
        message:
          "Your $99/month management subscription is now active. Welcome to The North!",
        category: "billing",
      },
    });

    // Auto-create GTM container for the client
    try {
      const account = await prisma.clientAccount.findUnique({
        where: { id: clientAccountId },
        include: { onboarding: true },
      });

      const containerName =
        account?.onboarding?.businessName || `Client ${clientAccountId}`;

      const gtm = await provisionGtmContainer(containerName);

      await prisma.clientAccount.update({
        where: { id: clientAccountId },
        data: {
          gtmAccountId: gtm.accountId,
          gtmContainerId: gtm.containerId,
          gtmPublicId: gtm.publicId,
          gtmSnippetHead: gtm.snippetHead,
          gtmSnippetBody: gtm.snippetBody,
        },
      });
    } catch (gtmError: any) {
      console.error(
        `GTM container creation failed for ${clientAccountId}:`,
        gtmError.message
      );
      // Non-fatal — admin can create manually later
      await prisma.alert.create({
        data: {
          clientAccountId,
          severity: "WARNING",
          title: "GTM container setup pending",
          message:
            "Automatic GTM container creation failed. An admin will set this up for you.",
          category: "system",
        },
      });
    }
  }
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  // Only care about subscription invoices
  const isSubscription =
    invoice.billing_reason === "subscription_cycle" ||
    invoice.billing_reason === "subscription_create";
  if (!isSubscription) return;

  const customerId = getCustomerId(invoice.customer);
  if (!customerId) return;

  const account = await prisma.clientAccount.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (account) {
    await prisma.alert.create({
      data: {
        clientAccountId: account.id,
        severity: "INFO",
        title: "Subscription payment successful",
        message: `Monthly subscription payment of $${(invoice.amount_paid / 100).toFixed(2)} was processed successfully.`,
        category: "billing",
      },
    });
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = getCustomerId(invoice.customer);
  if (!customerId) return;

  const account = await prisma.clientAccount.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (account) {
    await prisma.alert.create({
      data: {
        clientAccountId: account.id,
        severity: "CRITICAL",
        title: "Subscription payment failed",
        message:
          "Your monthly subscription payment failed. Please update your payment method to avoid service interruption.",
        category: "billing",
      },
    });
  }
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  // Only handle spend charge payments
  if (pi.metadata?.type !== "spend_charge") return;

  // Update the SpendCharge record
  await prisma.spendCharge.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data: { status: "SUCCEEDED" },
  });
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  if (pi.metadata?.type !== "spend_charge") return;

  // Update the SpendCharge record
  await prisma.spendCharge.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data: { status: "FAILED" },
  });

  // Create a critical alert
  const clientAccountId = pi.metadata?.clientAccountId;
  if (clientAccountId) {
    await prisma.alert.create({
      data: {
        clientAccountId,
        severity: "CRITICAL",
        title: "Ad spend charge failed",
        message: `A charge of $${(pi.amount / 100).toFixed(2)} for ad spend failed. Please update your payment method.`,
        category: "billing",
      },
    });
  }
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id;
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const clientAccountId = sub.metadata?.clientAccountId;
  if (!clientAccountId) return;

  // Mark the subscription as removed
  await prisma.clientAccount.update({
    where: { id: clientAccountId },
    data: { stripeSubscriptionId: null },
  });

  // Update user status
  const account = await prisma.clientAccount.findUnique({
    where: { id: clientAccountId },
    select: { userId: true },
  });

  if (account) {
    await prisma.user.update({
      where: { id: account.userId },
      data: { status: "CHURNED" },
    });
  }

  await prisma.alert.create({
    data: {
      clientAccountId,
      severity: "WARNING",
      title: "Subscription cancelled",
      message:
        "Your subscription has been cancelled. Your campaigns will be paused.",
      category: "billing",
    },
  });
}
