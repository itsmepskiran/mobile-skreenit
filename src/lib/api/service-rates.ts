import { apiGet } from '@/lib/api/client';

// Candidate service prices, read from the backend (pricing_plans — edited in the admin panel) so
// the app never hardcodes a coin cost or free quota. Mirrors sql-skreenit's
// assets/assets/js/service-rates.js. Both endpoints are public.

export interface ServiceRate {
  coin_cost: number | null;
  free_quota: number | null;
  price_inr: number | null;
  // Mock Interview Practice only: free interviews in the Free plan and the cheapest paid plan.
  free_interviews?: number | null;
  cheapest_plan_inr?: number | null;
}

export type CandidateRates = Record<
  'resume_writing' | 'employability_report' | 'video_analysis' | 'mock_interview',
  ServiceRate
>;

export function getCandidateRates() {
  return apiGet<{ ok: boolean; data: CandidateRates }>('/subscription/coins/rates', { auth: false });
}

export function describeRate(rate?: ServiceRate | null, short = false): string {
  if (!rate || rate.coin_cost == null) return '';
  if (rate.free_interviews != null) {
    const plans = rate.cheapest_plan_inr != null ? `from ₹${rate.cheapest_plan_inr}` : 'plans available';
    return short
      ? `${rate.free_interviews} free, then ${plans}`
      : `${rate.free_interviews} free interviews, then plans ${plans} or ${rate.coin_cost} coins each`;
  }
  const cost = `${rate.coin_cost} ${rate.coin_cost === 1 ? 'coin' : 'coins'}`;
  const free = Number(rate.free_quota) || 0;
  if (free > 0) return `${free === 1 ? 'First use' : `First ${free} uses`} free, then ${cost}`;
  return cost;
}
