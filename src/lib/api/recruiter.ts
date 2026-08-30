import { apiDelete, apiGet, apiPostJson, apiPut, apiUploadNative, pollAsyncJob, type UploadFile } from '@/lib/api/client';

// --- JD document upload -> autofill ------------------------------------------
// Ported from sql-skreenit/recruiter/js/job-create.js's handleJdUpload/autofillFromJD.
// The backend runs a full LLM extraction pass (30-120s observed on web, web
// raises its own client timeout to 150000ms for this call). apiUploadNative's
// native upload transport has no equivalent timeout override, so this submits
// to the async job endpoint and polls instead of holding one request open —
// see routers/recruiter_new.py's /jobs/parse-jd/async pair.
export interface ParsedJobDescription {
  available: boolean;
  job_title?: string;
  department?: string;
  role?: string;
  employment_type?: string;
  job_type?: string;
  industry?: string;
  education_qualification?: string;
  experience_min?: number;
  experience_max?: number;
  salary_min?: number;
  salary_max?: number;
  notice_period_days?: number;
  is_remote?: boolean;
  diversity_hiring?: boolean;
  responsibilities?: string;
  requirements?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  skills?: string[];
}

export async function parseJobDescription(file: UploadFile): Promise<{ ok: boolean; data: ParsedJobDescription }> {
  const submitRes = await apiUploadNative<{ ok: boolean; data: { job_id: string; status: string } }>(
    '/recruiter/jobs/parse-jd/async',
    file,
    'file',
  );
  const jobId = submitRes.data.job_id;
  const data = await pollAsyncJob<ParsedJobDescription>(() => apiGet(`/recruiter/jobs/parse-jd/async/${jobId}`));
  return { ok: true, data };
}

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
  jrf_number: string;
  reference_no: string;
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
  jrf_number: string;
  reference_no: string;
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

export function listMyJobs(params: { page?: number; pageSize?: number; status?: string; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  // `search` matches job_title, JRF Number, or Reference No — server-side, over this
  // recruiter's entire job set (not just the fetched page), so it finds a match regardless
  // of how many jobs they've posted.
  if (params.search) query.set('search', params.search);
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
// Per-job interview Q&A (video_responses table) — distinct from intro_video_url,
// which is the one-time profile-level video shared across every application.
export interface InterviewResponse {
  question: string;
  video_url: string;
  video_path: string | null;
  question_index: number;
  duration: number | null;
  transcript: string | null;
  created_at: string;
}

export interface RecruiterApplicationItem {
  id: string;
  job_id: string;
  candidate_id: string;
  cover_letter: string | null;
  intro_video_url: string | null;
  // What was actually submitted with THIS application — intro_video_url above
  // falls back to the candidate's general profile video (so a list badge/AI
  // analysis still has something to show), so gate any "did they submit a
  // video for this job" decision on this field instead.
  application_intro_video_url: string | null;
  resume_url: string | null;
  status: string;
  ai_score: number | null;
  // Automatic resume/JD match score (0-100), computed at application time.
  // Prefer this over ai_score, which is null until a recruiter manually
  // triggers on-demand LLM scoring.
  match_score: number | null;
  match_overall_fit: string | null;
  feedback: string | null;
  applied_at: string;
  updated_at: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  job_title: string;
  skills?: string[] | string;
  interview_responses?: InterviewResponse[];
  interview_video_count?: number;
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

// --- Candidate Search ---------------------------------------------------------
// Ported from sql-skreenit/dashboard/js/candidate-search.js. Free feature (RBAC
// only, no recruiter_plan gate). One row per application, not per candidate — a
// candidate who applied to N of this recruiter's jobs appears N times.
export interface CandidateSearchResult {
  candidate_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  skills: string[];
  experience_years: number | null;
  current_designation: string | null;
  current_company: string | null;
  application_id: string;
  job_id: string;
  job_title: string;
  jrf_number: string | null;
  reference_no: string | null;
  status: string;
  applied_at: string | null;
}

export interface CandidateSearchParams {
  q?: string;
  jrfRef?: string;
  jobId?: string;
  status?: string;
  experienceMin?: number;
  experienceMax?: number;
}

export function searchCandidates(params: CandidateSearchParams = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.jrfRef) query.set('jrf_ref', params.jrfRef);
  if (params.jobId) query.set('job_id', params.jobId);
  if (params.status) query.set('status', params.status);
  if (params.experienceMin != null) query.set('experience_min', String(params.experienceMin));
  if (params.experienceMax != null) query.set('experience_max', String(params.experienceMax));
  query.set('page_size', '50');
  return apiGet<{
    ok: boolean;
    data: { candidates: CandidateSearchResult[]; total: number; page: number; page_size: number };
  }>(`/recruiter/candidates/search?${query.toString()}`);
}

// --- Profile Ranking (AI) ------------------------------------------------------
// Ported from services/jd_matching_service.py. get_top_candidates ranks by
// candidate_name (not application_id) -- see routers/recruiter_new.py's
// /jobs/{job_id}/top-candidates.
export interface AiScoreBreakdown {
  ai_score: number | null;
  match_score: number | null;
  assessment_score: number | null;
  video_score: number | null;
}

export interface AiRankedCandidate {
  candidate_name: string;
  candidate_id: string;
  match_score: number;
  key_strengths: string[];
  concerns: string[];
  // Blend of ai_score (this match_score) + resume/JD match_score + assessment score +
  // video score, renormalized over whichever are available (see jd_matching_service.py).
  composite_score?: number | null;
  score_breakdown?: AiScoreBreakdown;
}

export function getTopCandidatesForJob(jobId: string, topN = 50) {
  return apiGet<{
    ok: boolean;
    data: { job_id: string; job_title: string; total_applicants: number; top_candidates: AiRankedCandidate[] };
  }>(`/recruiter/jobs/${jobId}/top-candidates?top_n=${topN}`);
}

export interface AiApplicationScore {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_fit: string;
  education_fit: string;
  strengths: string[];
  concerns: string[];
  hire_recommendation: string;
}

export interface AiApplicationScoreResult {
  application_id: string;
  job_title: string;
  candidate: string;
  score: AiApplicationScore;
}

// Runs one llama3 evaluation call server-side — a plain fetch() (apiPostJson/
// apiGet) has no AbortController/timeout override, so this submits to the
// async job endpoint and polls instead of holding one request open.
export async function getApplicationAiScore(applicationId: string): Promise<{ ok: boolean; data: AiApplicationScoreResult }> {
  const submitRes = await apiPostJson<{ ok: boolean; data: { job_id: string; status: string } }>(
    `/recruiter/applications/${applicationId}/ai-score/async`,
    {},
  );
  const jobId = submitRes.data.job_id;
  const data = await pollAsyncJob<AiApplicationScoreResult>(() =>
    apiGet(`/recruiter/applications/${applicationId}/ai-score/async/${jobId}`),
  );
  return { ok: true, data };
}

// --- Candidate profile (for the Interview Schedules "View Profile" modal) ----
// GET /recruiter/candidates/{id} — same endpoint web's candidate-details.html uses,
// combining the users + candidate_profiles tables.
export interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  summary: string | null;
  avatar_url: string | null;
  resume_url: string | null;
  intro_video_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  skills: string[];
  experience_years: number | null;
  experience: unknown[];
  education: unknown[];
  current_city: string | null;
  current_state: string | null;
}

export function getCandidateDetails(candidateId: string) {
  return apiGet<{ ok: boolean; data: { profile: CandidateProfile; user: Record<string, unknown> } }>(
    `/recruiter/candidates/${candidateId}`,
  );
}

// GET /recruiter/candidates/{id}/assessments — all of a candidate's completed
// assessment sessions across every job, not scoped to one job's assessment link.
export interface CandidateAssessmentSummary {
  session_id: string;
  assessment_key: string;
  assessment_name: string;
  format: string | null;
  overall_score: number | null;
  overall_grade: string | null;
  mcq_score: number | null;
  mcq_total: number | null;
  completed_at: string;
}

export function getCandidateAssessments(candidateId: string) {
  return apiGet<{ ok: boolean; data: CandidateAssessmentSummary[] }>(
    `/recruiter/candidates/${candidateId}/assessments`,
  );
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

// Uses apiUploadNative, not apiUpload — see applicant.ts's uploadAvatar for
// why (fetch+FormData throws "Unsupported FormDataPart implementation" for
// the {uri,name,type} shorthand on Android under this Expo Router version).
export function uploadRecruiterAvatar(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: { avatar_url: string } }>('/recruiter/profile/avatar', file, 'file');
}

export function uploadCompanyLogo(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: { avatar_url: string } }>('/recruiter/profile/company-logo', file, 'file');
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
  jrf_number: string;
  reference_no: string;
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
