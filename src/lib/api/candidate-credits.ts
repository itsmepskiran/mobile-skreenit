import { apiGet } from '@/lib/api/client';

// Candidate-side equivalent of the recruiter Credits page — backs the My Purchases screen.
// See mac-skreenit routers/applicant_new.py's get_candidate_credits_summary().
export interface CandidateCoinTransaction {
  event_type: 'purchase' | 'welcome_grant';
  feature_key: string;
  amount_coins: number;
  amount_inr: number | null;
  created_at: string | null;
}

export interface CandidateCreditsSummary {
  career_pass: { active: boolean; expiry_date: string | null };
  coin_balance: number;
  resume_writing_credits: number;
  employability_report_credits: number;
  recent_transactions: CandidateCoinTransaction[];
}

export function getCandidateCreditsSummary() {
  return apiGet<{ ok: boolean; data: CandidateCreditsSummary }>('/applicant/profile/credits-summary');
}
