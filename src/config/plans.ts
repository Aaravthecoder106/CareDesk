export type PlanTier = "basic" | "premium" | "family";
export type BillingPeriod = "monthly" | "yearly";
export type PaymentGateway = "stripe" | "razorpay";
export type Currency = "USD" | "INR" | "AED" | "EUR" | "GBP";

export const VALID_PLANS: PlanTier[] = ["basic", "premium", "family"];
export const VALID_PERIODS: BillingPeriod[] = ["monthly", "yearly"];
export const VALID_CURRENCIES: Currency[] = ["USD", "INR", "AED", "EUR", "GBP"];

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface PlanRecord {
  tier: PlanTier;
  displayName: string;
  stripePriceIds: Record<BillingPeriod, string | undefined>;
  razorpayAmounts: Record<BillingPeriod, number>;
  durationMs: Record<BillingPeriod, number>;
}

export const PLANS: Record<PlanTier, PlanRecord> = {
  basic: {
    tier: "basic",
    displayName: "Basic",
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ID_BASIC_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_BASIC_YEARLY,
    },
    razorpayAmounts: { monthly: 499, yearly: 3900 },
    durationMs: { monthly: MONTH_MS, yearly: YEAR_MS },
  },
  premium: {
    tier: "premium",
    displayName: "Premium",
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY,
    },
    razorpayAmounts: { monthly: 1299, yearly: 9900 },
    durationMs: { monthly: MONTH_MS, yearly: YEAR_MS },
  },
  family: {
    tier: "family",
    displayName: "Family",
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ID_FAMILY_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_FAMILY_YEARLY,
    },
    razorpayAmounts: { monthly: 1999, yearly: 14900 },
    durationMs: { monthly: MONTH_MS, yearly: YEAR_MS },
  },
};

export function resolveGateway(currency: Currency): PaymentGateway {
  return currency === "INR" ? "razorpay" : "stripe";
}

export function resolvePlanDuration(tier: PlanTier, period: BillingPeriod): number {
  return PLANS[tier].durationMs[period];
}

export function validatePlanPayload(plan: string, period: string, currency?: string): {
  valid: boolean;
  error?: string;
  planTier?: PlanTier;
  billingPeriod?: BillingPeriod;
  currencyCode?: Currency;
} {
  if (!VALID_PLANS.includes(plan as PlanTier)) {
    return { valid: false, error: "Invalid plan. Must be basic, premium, or family" };
  }
  if (!VALID_PERIODS.includes(period as BillingPeriod)) {
    return { valid: false, error: "Invalid period. Must be monthly or yearly" };
  }
  if (currency && !VALID_CURRENCIES.includes(currency as Currency)) {
    return { valid: false, error: "Invalid currency. Must be USD, INR, AED, EUR, or GBP" };
  }
  return {
    valid: true,
    planTier: plan as PlanTier,
    billingPeriod: period as BillingPeriod,
    currencyCode: (currency || "USD") as Currency,
  };
}
