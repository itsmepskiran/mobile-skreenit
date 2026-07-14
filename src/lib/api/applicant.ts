import { apiGet, apiPostJson, apiUpload, type UploadFile } from '@/lib/api/client';

// GET /profile returns a large merged object (users + candidate_profiles).
// Only a subset is listed here — the fields Phase 1 actually reads/edits.
// PUT/POST /profile only ever returns {id, action, avatar_url?}, never the
// full profile, so callers should refetch getProfile() after a successful update.
export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  summary: string | null;
  avatar_url: string | null;
  resume_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  experience_years: number | null;
  experience: unknown[] | null;
  education: unknown[] | null;
  onboarded: boolean;
}

export function getProfile() {
  return apiGet<{ ok: boolean; data: CandidateProfile }>('/applicant/profile');
}

export interface ProfileUpdateInput {
  full_name?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience_years?: number;
  linkedin_url?: string;
  portfolio_url?: string;
}

export function updateProfile(data: ProfileUpdateInput) {
  return apiPostJson<{ ok: boolean; data: { id: string; action: string } }>('/applicant/profile', data);
}

export function uploadAvatar(file: UploadFile) {
  return apiUpload<{ ok: boolean; data: { avatar_url: string } }>('/applicant/profile/avatar', file, 'file');
}

export function uploadResume(file: UploadFile) {
  return apiUpload<{ ok: boolean; data: { resume_url: string } }>('/applicant/profile/resume', file, 'file');
}

// Application status enum per database.py's JobApplication model — "pending" is a
// known backend quirk (submit_application() sets it, but it isn't in this enum),
// so UI mapping must have a neutral fallback for it/anything unrecognized.
export type ApplicationStatus =
  | 'submitted'
  | 'responses_submitted'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interviewing'
  | 'hired'
  | 'rejected'
  | 'pending'
  | (string & {});

export interface ApplicationStatusCheck {
  applied: boolean;
  status: ApplicationStatus;
  applied_at: string;
}

export function checkApplicationStatus(jobId: string) {
  return apiGet<{ ok: boolean; data: ApplicationStatusCheck | null }>(
    `/applicant/check-status?job_id=${encodeURIComponent(jobId)}`,
  );
}

export interface ApplyResult {
  id: string;
  job_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  applied_at: string;
}

export function applyToJob(jobId: string, coverLetter?: string) {
  return apiPostJson<{ ok: boolean; data: ApplyResult }>('/applicant/apply', {
    job_id: jobId,
    cover_letter: coverLetter,
  });
}

export interface ApplicationListItem {
  id: string;
  job_id: string;
  status: ApplicationStatus;
  feedback: string | null;
  applied_at: string;
  job_title: string;
  location: string;
  job_type: string;
  company_name: string;
  interview_video_count?: number;
}

export function listApplications() {
  return apiGet<{ ok: boolean; data: ApplicationListItem[] }>('/applicant/applications');
}
