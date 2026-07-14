import { apiGet } from '@/lib/api/client';

// GET /dashboard/jobs is the truly-public, fully-documented listing endpoint
// (also whitelisted in middleware/auth_middleware.py) — used instead of the
// less-defined /applicant/jobs. Only free-text `search` is supported
// server-side (matches job_title OR location) — no structured filters exist.
export interface JobListItem {
  id: string;
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
  return apiGet<{ ok: boolean; data: JobDetail }>(`/dashboard/jobs/${id}`, { auth: false });
}
