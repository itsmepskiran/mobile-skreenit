import { apiGet } from '@/lib/api/client';

// Referral scheme (mac-skreenit migration 102, routers/referrals.py). Mirrors the web "Refer & Earn" page.
export interface ReferralItem {
  name: string;
  status: 'pending' | 'rewarded';
  coins: number;
  joined_at: string | null;
  note: string | null;
}

export interface ReferralSummary {
  code: string;
  enabled: boolean;
  reward_coins: number;
  referee_bonus_coins: number;
  requires_verified_email: boolean;
  total: number;
  rewarded: number;
  pending: number;
  coins_earned: number;
  referrals: ReferralItem[];
  share_link: string;
  share_text: string;
}

export function getMyReferrals() {
  return apiGet<{ ok: boolean; data: ReferralSummary }>('/referrals/me');
}

// Public: lets the signup form say "Invited by Ravi" for a valid code.
export function validateReferralCode(code: string) {
  return apiGet<{ ok: boolean; data: { valid: boolean; referrer_first_name?: string | null } }>(
    `/referrals/validate?code=${encodeURIComponent(code)}`,
    { auth: false },
  );
}
