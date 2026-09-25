import { apiGet, apiPostJson } from '@/lib/api/client';

// Mirrors sql-skreenit's Payments/js/credits-checkout.js COIN_PACKS. Prices are display-only
// here — the actual charge always comes from POST /credits/order's server-computed price_inr
// (routers/credits.py's CREDIT_CATALOG), never from this constant.
export const COIN_PACKS = [
  { planId: 'coin_pack_100', coins: 100, priceInr: 500 },
  { planId: 'coin_pack_500', coins: 500, priceInr: 2299 },
  { planId: 'coin_pack_1000', coins: 1000, priceInr: 4299 },
] as const;

// Candidate coin economy (migration 069 in mac-skreenit) — a fully separate balance from the
// recruiter coins above, flat ₹5/coin with no bulk discount (10 coins is exactly one
// welcome-offer unit, so the point is transparency, not upselling bigger packs).
export const CANDIDATE_COIN_PACKS = [
  { planId: 'candidate_coin_pack_10', coins: 10, priceInr: 50 },
  { planId: 'candidate_coin_pack_30', coins: 30, priceInr: 150 },
  { planId: 'candidate_coin_pack_60', coins: 60, priceInr: 300 },
] as const;

export function getCoinBalance() {
  return apiGet<{ ok: boolean; data: { balance: number } }>('/subscription/coins/balance');
}

// recruiter_paid_actions.feature_key values a recruiter can spend coins on — see
// routers/subscription.py's get_coin_summary().
export interface CoinFeatureUsage {
  feature_key: string;
  coins_spent: number;
  paid_actions_count: number;
  free_actions_count: number;
}

export interface CoinTransaction {
  event_type: 'purchase' | 'recruiter_pro_grant' | 'unused_conversion' | 'consume';
  amount_coins: number;
  balance_after: number;
  amount_inr: number | null;
  reference_type: string | null;
  created_at: string | null;
}

export function getCoinSummary() {
  return apiGet<{
    ok: boolean;
    data: { balance: number; usage_by_feature: CoinFeatureUsage[]; recent_transactions: CoinTransaction[] };
  }>('/subscription/coins/summary');
}

export interface CreditOrder {
  order_id: string;
  amount: number;
  currency: string;
  plan_id: string;
  plan_name: string;
  price_inr: number;
}

export function createCreditOrder(planId: string) {
  return apiPostJson<{ ok: boolean; data: CreditOrder }>('/credits/order', { plan_id: planId });
}

export function confirmCreditPurchase(input: {
  planId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  return apiPostJson<{ ok: boolean; data: { feature_key: string; granted: number; balance: number } }>(
    '/credits/confirm',
    {
      plan_id: input.planId,
      razorpay_order_id: input.razorpayOrderId,
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_signature: input.razorpaySignature,
    },
  );
}
