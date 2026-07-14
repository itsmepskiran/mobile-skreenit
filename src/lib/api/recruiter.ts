import { apiDelete, apiGet, apiPostJson, apiPut, apiUpload, type UploadFile } from '@/lib/api/client';

// --- Job posting CRUD -------------------------------------------------------
// department/role/employment_type/job_type/industry/education_qualification are
// reference-data IDs (see routers/reference.py), not free text — despite being
// typed Optional[str] on the backend model. GET resolves them to display names
// and adds a sibling `*_id` key (e.g. department_id) so an edit form can
// re-populate its dropdowns; submit the `id` value back on create/update.
export interface JobInput {
  job_title: string;
  department?: string;
  role?: string;
  employment_type?: string;
  job_type: string;
  no_of_openings?: number;
  location?: string;
  location_country?: string;
  location_state?: string;
  location_city?: string;
  is_remote?: boolean;
  experience_min?: number;
  experience_max?: number;
  salary_min?: number;
  salary_max?: number;
  notice_period_days?: number;
  industry?: string;
  education_qualification?: string;
  skills?: string[];
  diversity_hiring?: boolean;
  description: string;
  responsibilities?: string;
  requirements?: string;
  contact_person_name?: string;
  contact_person_email?: string;
}

export interface RecruiterJobListItem {
  id: string;
  job_title: string;
  location: string;
  job_type: string;
  status: 'active' | 'closed' | 'draft' | (string & {});
  salary_min: number | null;
  salary_max: number | null;
  experience_min: number | null;
  experience_max: number | null;
  skills: string; // JSON-encoded array, same as RecruiterJobDetail — use parseSkills()
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  is_remote: boolean;
  created_at: string;
  updated_at: string;
}

export function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface RecruiterJobDetail {
  id: string;
  job_title: string;
  department: string | null;
  department_id: string | null;
  role: string | null;
  role_id: string | null;
  employment_type: string | null;
  employment_type_id: string | null;
  job_type: string;
  job_type_id: string;
  no_of_openings: number | null;
  location: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  is_remote: boolean;
  experience_min: number | null;
  experience_max: number | null;
  industry: string | null;
  industry_id: string | null;
  diversity_hiring: string | boolean;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  notice_period_days: number | null;
  education_qualification: string | null;
  education_qualification_id: string | null;
  skills: string; // JSON-encoded array — JSON.parse before use
  contact_person_name: string | null;
  contact_person_email: string | null;
  status: string;
  created_at: string;
}

function toSkillsPayload(skills?: string[]): string | undefined {
  return skills ? JSON.stringify(skills) : undefined;
}

export function listMyJobs(params: { page?: number; pageSize?: number; status?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  return apiGet<{ ok: boolean; data: { jobs: RecruiterJobListItem[]; count: number; page: number; page_size: number } }>(
    `/recruiter/jobs?${query.toString()}`,
  ).then((res) => {
    if (!params.status) return res;
    return { ...res, data: { ...res.data, jobs: res.data.jobs.filter((j) => j.status === params.status) } };
  });
}

export function getMyJob(id: string) {
  return apiGet<{ ok: boolean; data: RecruiterJobDetail }>(`/recruiter/jobs/${id}`);
}

export function createJob(input: JobInput) {
  return apiPostJson<{ ok: boolean; data: { data: unknown; id: string } }>('/recruiter/jobs', {
    ...input,
    skills: toSkillsPayload(input.skills),
  });
}

export function updateJob(id: string, input: Partial<JobInput>) {
  return apiPut<{ ok: boolean; data: unknown }>(`/recruiter/jobs/${id}`, {
    body: { ...input, skills: toSkillsPayload(input.skills) },
  });
}

export function deleteJob(id: string) {
  return apiDelete<{ ok: boolean; message?: string }>(`/recruiter/jobs/${id}`);
}

// --- Applications / candidate review ---------------------------------------
// The list endpoint is used as the sole data source for candidate review too —
// GET /recruiter/applications/{id} has a backend bug where candidate_name/email
// come back as "Unknown Candidate"/"No email available" (get_application_by_id's
// candidate-profile join doesn't resolve the way the router expects it to).
// The list endpoint's items already carry reliable candidate_name/email/phone
// plus everything else a review screen needs (status, resume, cover letter).
export interface RecruiterApplicationItem {
  id: string;
  job_id: string;
  candidate_id: string;
  cover_letter: string | null;
  intro_video_url: string | null;
  resume_url: string | null;
  status: string;
  ai_score: number | null;
  feedback: string | null;
  applied_at: string;
  updated_at: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  job_title: string;
  skills?: string[] | string;
}

export function listRecruiterApplications(params: { jobId?: string } = {}) {
  const query = params.jobId ? `?job_id=${encodeURIComponent(params.jobId)}` : '';
  return apiGet<{ ok: boolean; data: RecruiterApplicationItem[] }>(`/recruiter/applications${query}`);
}

// Matches the actual DB `application_status` enum (database.py) — not the web
// UI's simplified 5-value dropdown, which collapses several of these together.
export type RecruiterApplicationStatus =
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interviewing'
  | 'hired'
  | 'rejected';

export function updateApplicationStatus(
  id: string,
  input: { status: RecruiterApplicationStatus; rejectionReason?: string; questions?: string[] },
) {
  return apiPut<{ ok: boolean; message: string }>(`/recruiter/applications/${id}/status`, {
    body: {
      status: input.status,
      rejection_reason: input.rejectionReason,
      questions: input.questions,
    },
  });
}

// --- Recruiter / company profile --------------------------------------------
export interface RecruiterProfile {
  id?: string;
  user_id?: string;
  company_id?: string;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  avatar_url: string | null;
  company_name: string | null;
  company_website: string | null;
  company_description: string | null;
  company_display_id: string | null;
  company_logo_url: string | null;
}

export interface RecruiterProfileInput {
  contact_name?: string;
  contact_email?: string;
  location?: string;
  company_name: string; // required by the backend to (re)generate the company id
  company_description?: string;
  company_website?: string;
}

export function getRecruiterProfile() {
  return apiGet<{ ok: boolean; data: RecruiterProfile | Record<string, never> }>('/recruiter/profile');
}

// PUT /recruiter/profile nests the saved profile as data.data (unlike most
// other endpoints in this app, which return the object directly under data).
export function updateRecruiterProfile(input: RecruiterProfileInput) {
  return apiPut<{ ok: boolean; data: { data: RecruiterProfile; id: string; updated: boolean } }>('/recruiter/profile', {
    body: input,
  });
}

export function uploadRecruiterAvatar(file: UploadFile) {
  return apiUpload<{ ok: boolean; data: { avatar_url: string } }>('/recruiter/profile/avatar', file, 'file');
}

export function uploadCompanyLogo(file: UploadFile) {
  return apiUpload<{ ok: boolean; data: { avatar_url: string } }>('/recruiter/profile/company-logo', file, 'file');
}

// --- Dashboard analytics -----------------------------------------------------
export interface RecruiterStats {
  total_jobs: number;
  active_jobs: number;
  closed_jobs: number;
  total_applications: number;
  shortlisted: number;
  interviews: number;
  hired: number;
}

export function getRecruiterStats() {
  return apiGet<{ ok: boolean; data: RecruiterStats }>('/dashboard/recruiter/stats');
}

export interface RecruiterDashboardJob {
  id: string;
  job_title: string;
  title: string;
  status: string;
  created_at: string;
  location: string;
  job_type: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  experience_min: number | null;
  experience_max: number | null;
  applications_count: number;
  views: number;
  skills: string[];
}

// Note: unlike most list endpoints in this app, /dashboard/recruiter/jobs nests
// its array under data.jobs (with a sibling data.pagination), not data directly.
export function listRecentJobs(params: { page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  return apiGet<{
    ok: boolean;
    data: { jobs: RecruiterDashboardJob[]; pagination: { page: number; page_size: number; total: number } };
  }>(`/dashboard/recruiter/jobs?${query.toString()}`);
}

export interface RecruiterDashboardApplication {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
}

// Same data.applications-nested shape as listRecentJobs above.
export function listRecentApplications(params: { page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  return apiGet<{
    ok: boolean;
    data: { applications: RecruiterDashboardApplication[]; pagination: { page: number; page_size: number; total: number } };
  }>(`/dashboard/recruiter/applications?${query.toString()}`);
}
