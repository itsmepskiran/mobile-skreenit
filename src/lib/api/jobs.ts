import { apiDelete, apiGet, apiPostJson } from '@/lib/api/client';

// GET /dashboard/jobs is the truly-public, fully-documented listing endpoint
// (also whitelisted in middleware/auth_middleware.py) — used instead of the
// less-defined /applicant/jobs. Only free-text `search` is supported
// server-side (matches job_title, company_name, jrf_number, or reference_no) —
// no structured filters exist.
export interface JobListItem {
  id: string;
  jrf_number: string;
  reference_no: string;
  job_title: string;
  title: string;
  description: string;
  location: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  is_remote: boolean;
  status: string;
  company_name: string;
  skills: string[];
  created_at: string;
}

export interface JobDetail extends Omit<JobListItem, 'skills'> {
  requirements: string | null;
  department: string | null;
  role: string | null;
  employment_type: string | null;
  industry: string | null;
  education_qualification: string | null;
  experience_min: number | null;
  experience_max: number | null;
  notice_period_days: number | null;
  contact_person_name: string | null;
  contact_person_email: string | null;
}

export interface JobsPage {
  jobs: JobListItem[];
  pagination: { page: number; page_size: number; total: number };
}

export function listJobs(params: { search?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));

  return apiGet<{ ok: boolean; data: JobsPage }>(`/dashboard/jobs?${query.toString()}`, { auth: false });
}

export function getJob(id: string) {
  // Public endpoint (see middleware/auth_middleware.py), but send the token anyway when
  // available — belt-and-suspenders in case that ever changes, and harmless either way.
  return apiGet<{ ok: boolean; data: JobDetail }>(`/dashboard/jobs/${id}`);
}

// Personalized resume/JD match score(s) — informational only, never restricts
// applying. Requires auth (computed against the candidate's own profile).
export interface JobMatchScore {
  match_score: number;
  overall_fit: 'high' | 'medium' | 'low';
}

export interface JobMatchScoreDetail extends JobMatchScore {
  skills_matched: string[];
  skills_missing: string[];
}

export function getJobsMatchScores(jobIds: string[]) {
  if (jobIds.length === 0) {
    return Promise.resolve({ ok: true, data: {} as Record<string, JobMatchScore> });
  }
  return apiGet<{ ok: boolean; data: Record<string, JobMatchScore> }>(
    `/applicant/jobs/match-scores?job_ids=${encodeURIComponent(jobIds.join(','))}`
  );
}

export function getJobMatchScore(id: string) {
  return apiGet<{ ok: boolean; data: JobMatchScoreDetail | null }>(`/applicant/jobs/${id}/match-score`);
}

// --- Saved jobs (bookmarks) --------------------------------------------------
export function listSavedJobs() {
  return apiGet<{ ok: boolean; data: { jobs: JobListItem[] } }>('/applicant/saved-jobs');
}

export function saveJob(jobId: string) {
  return apiPostJson<{ ok: boolean; message: string }>(`/applicant/jobs/${jobId}/save`, {});
}

export function unsaveJob(jobId: string) {
  return apiDelete<{ ok: boolean; message: string }>(`/applicant/jobs/${jobId}/save`);
}
