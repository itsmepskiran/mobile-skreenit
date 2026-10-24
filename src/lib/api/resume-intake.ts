import { apiGet, apiPostJson, apiUploadNative, type UploadFile } from '@/lib/api/client';

// Bulk resume upload with automatic screening (backend routers/resume_intake.py, same as
// web's recruiter/bulk-resumes.html). The recruiter uploads resumes downloaded from Naukri,
// foundit, LinkedIn, email or referrals into a job; the backend reads and scores each one in
// the background and can invite the best ones to the job's assessments.

export type ResumeSource = 'naukri' | 'foundit' | 'linkedin' | 'email' | 'referral' | 'other';

export interface ResumeUploadOptions {
  source: ResumeSource;
  autoInvite: boolean;
  minScore: number;
  maxInvites: number;
}

export interface ResumeUploadRow {
  id: string;
  batch_id: string;
  file_name: string;
  resume_url: string | null;
  source: ResumeSource;
  status: 'queued' | 'processing' | 'done' | 'failed' | 'duplicate';
  error: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  match_score: number | null;
  skills_matched: string[];
  skills_missing: string[];
  experience_years: number | null;
  invite_status:
    | 'not_invited'
    | 'invited'
    | 'already_invited'
    | 'no_email'
    | 'below_cutoff'
    | 'cap_reached'
    | 'needs_assessment';
  invite_token: string | null;
  created_at: string;
}

export interface ResumeUploadList {
  job: { id: string; job_title: string | null };
  rows: ResumeUploadRow[];
  counts: Record<'total' | 'queued' | 'processing' | 'done' | 'failed' | 'duplicate' | 'invited', number>;
  processing: boolean;
  has_assessment: boolean;
}

export interface UploadSkip {
  file_name: string;
  reason: string;
}

// apiUploadNative sends one file per request (see client.ts), so each file goes up with
// `hold` set, sharing the batch id the first upload returns; startResumeBatch then screens
// them together, so ranking and the auto-invite limit cover the whole set.
export function uploadResumeToBatch(jobId: string, file: UploadFile, options: ResumeUploadOptions, batchId?: string) {
  const fields: Record<string, string | number> = {
    source: options.source,
    auto_invite: options.autoInvite ? 'true' : 'false',
    min_score: options.minScore,
    max_invites: options.maxInvites,
    hold: 'true',
  };
  if (batchId) fields.batch_id = batchId;
  return apiUploadNative<{ ok: boolean; data: { batch_id: string; queued: number; skipped: UploadSkip[] } }>(
    `/recruiter/jobs/${jobId}/resume-uploads`,
    file,
    'files',
    fields,
  );
}

export function startResumeBatch(jobId: string, batchId: string) {
  return apiPostJson<{ ok: boolean; data: { batch_id: string; queued: number } }>(
    `/recruiter/jobs/${jobId}/resume-uploads/${batchId}/start`,
    {},
  );
}

export function listResumeUploads(jobId: string) {
  return apiGet<{ ok: boolean; data: ResumeUploadList }>(`/recruiter/jobs/${jobId}/resume-uploads`);
}

export function inviteUploadedResumes(jobId: string, ids: string[]) {
  return apiPostJson<{
    ok: boolean;
    data: {
      invited: { id: string; email: string | null; phone: string | null; full_name: string | null; token: string }[];
      sent: number;
      skipped: { id: string; full_name: string | null; reason: 'no_contact' | 'already_invited'; token?: string | null }[];
    };
  }>(`/recruiter/jobs/${jobId}/resume-uploads/invite`, { ids });
}
