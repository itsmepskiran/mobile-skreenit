import { apiGet } from '@/lib/api/client';

export interface CandidateStats {
  total_applications: number;
  shortlisted: number;
  interviews: number;
  hired: number;
}

export function getCandidateStats() {
  return apiGet<{ ok: boolean; data: CandidateStats }>('/dashboard/candidate/stats');
}

export interface CandidateDashboardApplication {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
  job_title: string | null;
  location: string | null;
  job_type: string | null;
}

export function listRecentCandidateApplications(params: { page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  return apiGet<{
    ok: boolean;
    data: { applications: CandidateDashboardApplication[]; pagination: { page: number; page_size: number; total: number } };
  }>(`/dashboard/candidate/applications?${query.toString()}`);
}
