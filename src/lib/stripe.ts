import Stripe from "stripe";
import { SPEND_CHARGE_THRESHOLD_CENTS, SUBSCRIPTION_PRICE_CENTS } from "./metrics";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// ─── Customer Management ────────────────────────────────────

/**
 * Create a Stripe customer for a new client.
 */
export async function createStripeCustomer(input: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const customer = await getStripe().customers.create({
    email: input.email,
    name: input.name || undefined,
    metadata: {
      source: "the-north",
      ...input.metadata,
    },
  });
  return customer.id;
}

// ─── Subscription ($99/month) ───────────────────────────────

/**
 * Create a Stripe Checkout session for the $99/month subscription.
 * Redirects the client to Stripe's hosted checkout page.
 */
export async function createSubscriptionCheckout(input: {
  stripeCustomerId: string;
  clientAccountId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  // Find or create the $99/month price
  const priceId = await getOrCreateSubscriptionPrice();

  const session = await getStripe().checkout.sessions.create({
    customer: input.stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      clientAccountId: input.clientAccountId,
    },
    subscription_data: {
      metadata: {
        clientAccountId: input.clientAccountId,
      },
    },
  });

  return session.url || "";
}

/**
 * Find or create the $99/month subscription price in Stripe.
 */
async function getOrCreateSubscriptionPrice(): Promise<string> {
  // Check for existing product by metadata
  const existingProducts = await getStripe().products.search({
    query: `metadata["app"]:"the-north" AND metadata["type"]:"subscription"`,
  });

  if (existingProducts.data.length > 0) {
    const product = existingProducts.data[0];
    const prices = await getStripe().prices.list({
      product: product.id,
      active: true,
      limit: 1,
    });
    if (prices.data.length > 0) {
      return prices.data[0].id;
    }
  }

  // Create product + price
  const product = await getStripe().products.create({
    name: "The North — Monthly Management",
    description: "Google Ads campaign management subscription",
    metadata: { app: "the-north", type: "subscription" },
  });

  const price = await getStripe().prices.create({
    product: product.id,
    unit_amount: SUBSCRIPTION_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "month" },
  });

  return price.id;
}

// ─── Spend Threshold Charges ($300 increments) ──────────────

/**
 * Create a one-time charge against the client's saved payment method
 * for a $300 ad spend threshold.
 *
 * Uses Stripe PaymentIntents for reliability and idempotency.
 */
export async function createSpendCharge(input: {
  stripeCustomerId: string;
  amountCents: number;
  clientAccountId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
}): Promise<{ paymentIntentId: string; status: string }> {
  // Get the customer's default payment method from their subscription
  const customer = await getStripe().customers.retrieve(input.stripeCustomerId);
  if (customer.deleted) {
    throw new Error("Stripe customer has been deleted");
  }

  const defaultPaymentMethod =
    customer.invoice_settings?.default_payment_method as string | null;

  if (!defaultPaymentMethod) {
    // Fall back: try to get the payment method from an active subscription
    const subscriptions = await getStripe().subscriptions.list({
      customer: input.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription or payment method on file");
    }

    const sub = subscriptions.data[0];
    const paymentMethod = sub.default_payment_method as string | null;

    if (!paymentMethod) {
      throw new Error("No payment method found on subscription");
    }

    // Create the payment intent with this payment method
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: input.amountCents,
      currency: "usd",
      customer: input.stripeCustomerId,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
      description: `Ad spend charge — ${input.periodStart} to ${input.periodEnd}`,
      metadata: {
        clientAccountId: input.clientAccountId,
        type: "spend_charge",
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  }

  // Create and confirm the payment intent
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: input.amountCents,
    currency: "usd",
    customer: input.stripeCustomerId,
    payment_method: defaultPaymentMethod,
    off_session: true,
    confirm: true,
    description: `Ad spend charge — ${input.periodStart} to ${input.periodEnd}`,
    metadata: {
      clientAccountId: input.clientAccountId,
      type: "spend_charge",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
  };
}

// ─── Portal ─────────────────────────────────────────────────

/**
 * Create a Stripe Customer Portal session so clients can
 * manage their payment methods and view invoices.
 */
export async function createPortalSession(input: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });
  return session.url;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Cancel a client's subscription (at period end by default).
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<void> {
  if (immediately) {
    await getStripe().subscriptions.cancel(subscriptionId);
  } else {
    await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Resume a subscription that was set to cancel at period end.
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export { SPEND_CHARGE_THRESHOLD_CENTS, SUBSCRIPTION_PRICE_CENTS };
