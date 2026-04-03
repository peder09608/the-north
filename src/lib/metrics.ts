export const MARKUP_RATE = parseFloat(process.env.MARKUP_RATE || "0.15");

export interface MarkedUpCost {
  rawSpendCents: number;
  markupCents: number;
  totalCents: number;
  displaySpend: number; // dollars with markup, for client-facing display
}

/**
 * Apply the markup to raw Google Ads cost (in micros).
 * Google Ads reports cost in micros: 1 dollar = 1,000,000 micros.
 */
export function applyMarkup(costMicros: bigint): MarkedUpCost {
  const rawSpendCents = Math.round(Number(costMicros) / 10_000); // micros → cents
  const markupCents = Math.round(rawSpendCents * MARKUP_RATE);
  const totalCents = rawSpendCents + markupCents;
  return {
    rawSpendCents,
    markupCents,
    totalCents,
    displaySpend: totalCents / 100,
  };
}

/**
 * Convert costMicros to raw dollars (no markup). For admin views.
 */
export function microsToRawDollars(costMicros: bigint): number {
  return Number(costMicros) / 1_000_000;
}

/**
 * Convert costMicros to display dollars (with markup). For client views.
 */
export function microsToDisplayDollars(costMicros: bigint): number {
  return applyMarkup(costMicros).displaySpend;
}

/**
 * Calculate derived metrics from raw values.
 */
export function calculateDerivedMetrics(data: {
  impressions: number;
  clicks: number;
  costMicros: bigint;
  conversions: number;
  conversionValue: number;
  applyClientMarkup?: boolean;
}) {
  const spend = data.applyClientMarkup !== false
    ? microsToDisplayDollars(data.costMicros)
    : microsToRawDollars(data.costMicros);

  return {
    spend,
    impressions: data.impressions,
    clicks: data.clicks,
    conversions: data.conversions,
    conversionValue: data.conversionValue,
    ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    cpa: data.conversions > 0 ? spend / data.conversions : 0,
    roas: spend > 0 ? data.conversionValue / spend : 0,
  };
}

export const SPEND_CHARGE_THRESHOLD_CENTS = 30_000; // $300
export const SUBSCRIPTION_PRICE_CENTS = 9_900; // $99
