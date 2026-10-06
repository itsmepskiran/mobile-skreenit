import { apiGet } from '@/lib/api/client';
import type { WelcomeExpiring } from '@/lib/api/credits';

// Candidate-side equivalent of the recruiter Credits page — backs the My Purchases screen.
// See mac-skreenit routers/applicant_new.py's get_candidate_credits_summary().
export interface CandidateCoinTransaction {
  event_type: 'purchase' | 'welcome_grant' | 'expiry' | 'consume';
  feature_key: string;
  // Which service a 'consume' row paid for; null on purchases/grants.
  reference_type: 'resume_writing' | 'employability_report' | 'video_analysis' | 'mock_interview' | null;
  amount_coins: number;
  amount_inr: number | null;
  created_at: string | null;
}

export interface CandidateServiceUsage {
  uses: number;
  coins_spent: number;
  credits_used: number;
}

export interface CandidateCreditsSummary {
  career_pass: { active: boolean; expiry_date: string | null };
  coin_balance: number;
  welcome_expiring: WelcomeExpiring | null;
  resume_writing_credits: number;
  employability_report_credits: number;
  usage: {
    resume_writing: CandidateServiceUsage;
    employability_report: CandidateServiceUsage;
    video_analysis: CandidateServiceUsage;
    mock_interview: CandidateServiceUsage;
  };
  recent_transactions: CandidateCoinTransaction[];
}

export function getCandidateCreditsSummary() {
  return apiGet<{ ok: boolean; data: CandidateCreditsSummary }>('/applicant/profile/credits-summary');
}
