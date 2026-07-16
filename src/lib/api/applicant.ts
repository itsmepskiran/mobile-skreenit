import * as FileSystem from 'expo-file-system/legacy';

import { apiGet, apiPostJson, apiUploadNative, type UploadFile } from '@/lib/api/client';

// Previous-experience entries beyond the current/latest role — freeform JSON
// stored as-is (candidate_profiles.experience), shape matches what the real
// web wizard (application-form.js) already writes so data stays compatible
// across platforms.
export interface ExperienceEntry {
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

// Additional degrees/certifications beyond the fixed schooling/PUC/graduation/
// post-graduation fields — same freeform-JSON pattern as ExperienceEntry.
export interface EducationEntry {
  degree: string;
  institution: string;
  completion_year: string;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

// GET /profile returns a large merged object (users + candidate_profiles).
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
  intro_video_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  experience_years: number | null;
  experience: ExperienceEntry[] | null;
  education: EducationEntry[] | null;
  onboarded: boolean;
  candidate_display_id: string | null;
  // Personal details
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  // Current address
  current_address: string | null;
  current_city: string | null;
  current_state: string | null;
  current_country: string | null;
  // Permanent address
  permanent_address: string | null;
  permanent_city: string | null;
  permanent_state: string | null;
  permanent_country: string | null;
  // Professional details
  current_salary: number | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  highest_qualification: string | null;
  // Social/Projects
  personal_projects: string | null;
  personal_blogs: string | null;
  // Education details (fixed levels, separate from the `education` array above)
  schooling: string | null;
  schooling_year: number | null;
  schooling_percentage: string | null;
  pre_university: string | null;
  pre_university_year: number | null;
  pre_university_percentage: string | null;
  graduation: string | null;
  graduation_year: number | null;
  graduation_percentage: string | null;
  post_graduation: string | null;
  post_graduation_year: number | null;
  post_graduation_percentage: string | null;
  // Skills & Languages
  spoken_languages: string[] | null;
  certifications: CertificationEntry[] | null;
  // Current/latest experience
  current_company: string | null;
  current_designation: string | null;
  current_doj: string | null;
  current_dol: string | null;
}

export function getProfile() {
  return apiGet<{ ok: boolean; data: CandidateProfile }>('/applicant/profile');
}

// Mirrors candidate_service.upsert_profile's accepted field set exactly —
// sent as plain JSON via POST /applicant/profile (no multipart/FormData
// juggling needed; that's only required by the web's combined file+field PUT).
export interface ProfileUpdateInput {
  full_name?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience_years?: number;
  linkedin_url?: string;
  portfolio_url?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  current_address?: string;
  current_city?: string;
  current_state?: string;
  current_country?: string;
  permanent_address?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_country?: string;
  current_salary?: number;
  expected_salary?: number;
  notice_period_days?: number;
  highest_qualification?: string;
  personal_projects?: string;
  personal_blogs?: string;
  schooling?: string;
  schooling_year?: number;
  schooling_percentage?: string;
  pre_university?: string;
  pre_university_year?: number;
  pre_university_percentage?: string;
  graduation?: string;
  graduation_year?: number;
  graduation_percentage?: string;
  post_graduation?: string;
  post_graduation_year?: number;
  post_graduation_percentage?: string;
  spoken_languages?: string[];
  certifications?: CertificationEntry[];
  current_company?: string;
  current_designation?: string;
  current_doj?: string;
  current_dol?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
}

export function updateProfile(data: ProfileUpdateInput) {
  return apiPostJson<{ ok: boolean; data: { id: string; action: string } }>('/applicant/profile', data);
}

export interface CollegeOption {
  id: number;
  name: string;
  city_name: string | null;
  state_name: string | null;
}

export function searchColleges(query: string) {
  return apiGet<CollegeOption[]>(`/locations/colleges?search=${encodeURIComponent(query)}&limit=20`, { auth: false });
}

// Uses apiUploadNative, not apiUpload: the fetch+FormData {uri,name,type}
// shorthand throws "Unsupported FormDataPart implementation" on Android under
// this Expo Router/Hermes combination (same bug found and fixed for the
// video-intro/interview-question uploads — see apiUploadNative's comment).
export function uploadAvatar(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: { avatar_url: string } }>('/applicant/profile/avatar', file, 'file');
}

export function uploadResume(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: { resume_url: string } }>('/applicant/profile/resume', file, 'file');
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

// --- Video introduction (profile wizard step 7) ---
// Mirrors the web's applicant/detailed-application-form.html "Video Introduction"
// step: 3 AI-generated questions (Q1 is always "introduce yourself"), one video
// recorded per question, uploaded and saved individually. This is profile-level
// (candidate_intro_responses/candidate_videos, keyed by user, not job_applications),
// distinct from the per-job interview flow in applications/[id].

export interface GeneratedQuestions {
  questions: string[];
  source: 'ai' | 'fallback';
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

// Backend requires a resume file even for the fallback path — downloads the
// candidate's already-uploaded resume (from profile.resume_url) to a local
// cache file rather than asking them to re-pick it. Deliberately not
// `fetch(resumeUrl).blob()` + FormData — React Native's Blob polyfill can't
// reliably be re-attached to a new multipart request (throws "Creating blobs
// from 'ArrayBuffer' and 'ArrayBufferView' are not supported" on Android);
// routing through a local file uses the same {uri,name,type} upload path
// that every other upload in this app already relies on.
export async function generateInterviewQuestions(resumeUrl: string) {
  const name = resumeUrl.split('/').pop() || 'resume.pdf';
  const localUri = `${FileSystem.cacheDirectory}${name}`;
  const downloaded = await FileSystem.downloadAsync(resumeUrl, localUri);

  return apiUploadNative<{ ok: boolean; data: GeneratedQuestions }>(
    '/applicant/generate-interview-questions',
    { uri: downloaded.uri, name, type: guessMimeType(name) },
    'resume',
  );
}

export interface VideoUploadResult {
  path: string;
  url: string;
}

// `application_id` is a required Form field on the backend but unused for this
// profile-level flow — sent empty, matching the web's onboarding-interview call.
export function uploadIntroVideoResponse(file: UploadFile, questionIndex: number, question: string) {
  return apiUploadNative<{ data: VideoUploadResult }>(
    '/applicant/upload-video-response',
    file,
    'video_file',
    { application_id: '', question_index: questionIndex, question },
  );
}

export function saveIntroResponse(input: {
  questionIndex: number;
  question: string;
  videoUrl: string;
  videoPath: string;
}) {
  return apiPostJson<{ ok: boolean; data: { id: string } }>('/applicant/save-intro-response', {
    question_index: input.questionIndex,
    question: input.question,
    video_url: input.videoUrl,
    video_path: input.videoPath,
  });
}

export interface CandidateVideo {
  id: string;
  candidate_id: string;
  video_type: string;
  video_url: string;
  video_path: string | null;
  created_at: string;
}

export function getCandidateVideos() {
  return apiGet<{ ok: boolean; data: CandidateVideo[] }>('/applicant/videos');
}
