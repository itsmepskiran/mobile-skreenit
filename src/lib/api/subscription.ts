import { apiGet, apiPostJson } from '@/lib/api/client';

// Mirrors routers/subscription.py's public plan shape (GET /subscription/pricing/plans).
export interface PricingPlan {
  id: string;
  service_type: string;
  service_key: string;
  name: string;
  description: string | null;
  price_inr: number;
  currency: string;
  billing_cycle: string;
  trial_days: number | null;
  duration: string | null;
  features: string | string[] | null;
}

export function listPricingPlans(serviceType = 'applicant_plan') {
  return apiGet<{ ok: boolean; data: PricingPlan[] }>(
    `/subscription/pricing/plans?service_type=${encodeURIComponent(serviceType)}`,
    { auth: false },
  );
}

export interface CreatedSubscription {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
}

export function createSubscription(planId: string) {
  return apiPostJson<{ ok: boolean; data: CreatedSubscription }>('/subscription/create', { plan_id: planId });
}

export interface RazorpayOrder {
  order_id: string;
  amount: number; // paise
  currency: string;
}

export function createRazorpayOrder(input: { amount: number; subscriptionId: string; serviceType: string }) {
  return apiPostJson<{ ok: boolean; data: RazorpayOrder }>('/subscription/create-order', {
    amount: input.amount,
    currency: 'INR',
    subscription_id: input.subscriptionId,
    service_type: input.serviceType,
  });
}

export function getPaymentConfig() {
  return apiGet<{ ok: boolean; data: { key_id: string; currency: string; company_name: string } }>(
    '/subscription/payment-config',
    { auth: false },
  );
}

export function confirmSubscription(input: {
  subscriptionId: string;
  paymentMethod: string;
  transactionId: string;
  amountPaid: number;
}) {
  return apiPostJson<{ ok: boolean }>('/subscription/confirm', {
    subscription_id: input.subscriptionId,
    payment_method: input.paymentMethod,
    transaction_id: input.transactionId,
    amount_paid: input.amountPaid,
  });
}

export interface ActiveSubscription {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  plan_label: string | null;
  service_key: string | null;
  service_type: string;
  status: string;
  start_date: string | null;
  expiry_date: string | null;
  trial_end_date: string | null;
  features: string | string[] | null;
}

export function getActiveSubscriptions() {
  return apiGet<{ ok: boolean; data: ActiveSubscription[] }>('/subscription/active');
}

// Every purchase regardless of status (active/trial/expired/cancelled) —
// unlike getActiveSubscriptions, which only returns currently-usable ones.
// Same endpoint/shape for candidates and recruiters: both buy through the
// same user_subscriptions table, scoped by user_id rather than role.
export interface PurchaseHistoryItem {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  service_key: string | null;
  service_type: string;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  razorpay_order_id: string | null;
  amount_paid: number | null;
  start_date: string | null;
  expiry_date: string | null;
  trial_end_date: string | null;
  created_at: string;
}

export function getPurchaseHistory() {
  return apiGet<{ ok: boolean; data: PurchaseHistoryItem[] }>('/subscription/history');
}
