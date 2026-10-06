import { apiGet } from '@/lib/api/client';

// Cost preview for a coin-metered action — backs the confirm-before-spend modal
// (components/coin-consent-modal.tsx). Read-only: nothing is charged by asking.
// See mac-skreenit services/action_quote_service.py.
export type CoinAction =
  | 'resume_writing'
  | 'employability_report'
  | 'assessment_invite'
  | 'detailed_analysis'
  | 'ai_interview_analysis'
  | 'video_analysis'
  | 'mock_interview'
  | 'featured_job';

export interface CoinQuote {
  action: CoinAction;
  label: string;
  units: number;
  coin_cost_per_unit: number;
  price_inr: number | null;
  // 'free' (first use / free quota), 'unlimited' (Career Pass / plan), 'company_quota', 'credit',
  // 'coins', 'invoice' (company billed on invoice — featured_job), 'blocked' (mock-interview daily cap)
  method: 'free' | 'unlimited' | 'company_quota' | 'credit' | 'coins' | 'invoice' | 'blocked';
  invoice_inr?: number | null;
  free_units: number;
  paid_units: number;
  coins_required: number;
  credits_required: number;
  balance: number;
  balance_after: number | null;
  sufficient: boolean;
  needs_consent: boolean;
  coin_balance_key: 'coins' | 'candidate_coins' | null;
}

export interface CoinQuoteRequest {
  action: CoinAction;
  jobId?: string;
  applicationId?: string;
  count?: number;
}

export function getCoinQuote({ action, jobId, applicationId, count = 1 }: CoinQuoteRequest) {
  const params = new URLSearchParams({ action, count: String(count) });
  if (jobId) params.set('job_id', jobId);
  if (applicationId) params.set('application_id', applicationId);
  return apiGet<{ ok: boolean; data: CoinQuote }>(`/subscription/coins/quote?${params.toString()}`);
}
