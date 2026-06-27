export const USD_PLANS = {
  basic: { monthly: 4.99, annual: 39 },
  premium: { monthly: 12.99, annual: 99 },
  family: { monthly: 19.99, annual: 149 },
} as const;

export function formatUSD(amount: number): string {
  return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}
