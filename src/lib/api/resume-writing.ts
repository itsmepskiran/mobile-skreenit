import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiDelete, apiGet, apiPostJson, apiPut, apiUploadNative, type UploadFile } from '@/lib/api/client';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_BASE_URL, API_V1 } from '@/lib/config';

// Resume Writing Services (rewritten Oct 2026). Three ways to get a draft (improve an upload,
// build from scratch, tailor an existing draft to a job); every draft can then be edited,
// ATS-checked, downloaded as PDF (Skreenit templates) or Word, and saved as the profile resume.
// Generation runs in the background and the screen polls. See mac-skreenit/routers/resume_writing.py.

const BASE = '/candidate/resume-writing';

export interface ResumeExperienceInput {
  company?: string;
  position?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ResumeEducationInput {
  degree?: string;
  field?: string;
  institution?: string;
  year?: string;
  score?: string;
}

export interface ResumeProjectInput {
  name?: string;
  description?: string;
  url?: string;
}

// Same field names as the backend's CreateFromScratchRequest (and GET /prefill's answer).
export interface ScratchInput {
  full_name: string;
  target_role: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  experience: ResumeExperienceInput[];
  projects: ResumeProjectInput[];
  education: ResumeEducationInput[];
  skills: string[];
  certifications: string[];
  achievements: string[];
  languages: string[];
  jd_text?: string;
}

// The draft content shape (mac-skreenit services/resume_writing_content.py).
export interface ResumeContent {
  contact_info: { name: string; emails: string[]; phones: string[]; linkedin: string[]; github: string[]; website: string[] };
  headline: string;
  location: string;
  sections: { summary: string };
  experience: { company: string; position: string; location: string; start_date: string; end_date: string; highlights: string[] }[];
  projects: { name: string; description: string; url: string; highlights: string[] }[];
  education: { institution: string; degree: string; field: string; start_date: string; end_date: string; score: string }[];
  skills: string[];
  certificates: { name: string; issuer: string; date: string }[];
  awards: { title: string; date: string; awarder: string }[];
  languages: string[];
  improvement_notes: { section: string; before: string; after: string }[];
  ats_keyword_suggestions: string[];
}

export interface AtsCheck {
  score: number;
  word_count: number;
  checks: { id: string; label: string; ok: boolean; tip: string }[];
  job_keywords?: { found: string[]; missing: string[] };
}

export interface ResumeWritingDraft {
  id: string;
  source_type: 'upload' | 'scratch' | 'tailor';
  title: string | null;
  template_id: string | null;
  pdf_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  ai_content?: ResumeContent;
  ats_check?: AtsCheck;
  jd_text?: string;
  target_role?: string;
  tailored_from?: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  ats_safe: boolean;
  preview_url: string;
}

type Queued = { ok: boolean; data: { draft_id: string; status: string } };

export function improveResume(file: UploadFile, options: { jdText?: string; targetRole?: string } = {}) {
  return apiUploadNative<Queued>(`${BASE}/improve`, file, 'resume', {
    jd_text: options.jdText ?? '',
    target_role: options.targetRole ?? '',
  });
}

export function createResumeFromScratch(input: ScratchInput) {
  return apiPostJson<Queued>(`${BASE}/create`, input);
}

export function tailorResumeDraft(draftId: string, jdText: string) {
  return apiPostJson<Queued>(`${BASE}/${draftId}/tailor`, { jd_text: jdText });
}

export function getResumePrefill() {
  return apiGet<{ ok: boolean; data: ScratchInput }>(`${BASE}/prefill`);
}

export function listResumeTemplates() {
  return apiGet<{ ok: boolean; data: ResumeTemplate[] }>(`${BASE}/templates`, { auth: false });
}

export function listResumeDrafts() {
  return apiGet<{ ok: boolean; data: ResumeWritingDraft[] }>(BASE);
}

export function getResumeDraft(draftId: string) {
  return apiGet<{ ok: boolean; data: ResumeWritingDraft }>(`${BASE}/${draftId}`);
}

export function saveResumeDraftContent(draftId: string, content: ResumeContent) {
  return apiPut<{ ok: boolean; data: { ai_content: ResumeContent; ats_check: AtsCheck } }>(`${BASE}/${draftId}/content`, {
    body: { content },
  });
}

export function checkResumeAgainstJob(draftId: string, jdText: string) {
  return apiPostJson<{ ok: boolean; data: AtsCheck }>(`${BASE}/${draftId}/ats-check`, { jd_text: jdText });
}

export function saveResumeToProfile(draftId: string, templateId: string | null) {
  return apiPostJson<{ ok: boolean; data: { resume_url: string } }>(`${BASE}/${draftId}/save-to-profile`, {
    template_id: templateId,
  });
}

export function deleteResumeDraft(draftId: string) {
  return apiDelete<{ ok: boolean }>(`${BASE}/${draftId}`);
}

// Template previews are a static mount at the backend root, not under /api/v1.
export function templatePreviewUri(t: ResumeTemplate) {
  return `${API_BASE_URL}${t.preview_url}`;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Pure-JS base64 encoder — avoids relying on a global btoa (binary-safe only
// for Latin1 strings, awkward for large byte arrays) or a Buffer polyfill,
// neither of which this app otherwise depends on.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 0x03) << 4) | ((b2 ?? 0) >> 4)];
    result += b2 !== undefined ? BASE64_CHARS[((b2 & 0x0f) << 2) | ((b3 ?? 0) >> 6)] : '=';
    result += b3 !== undefined ? BASE64_CHARS[b3 & 0x3f] : '=';
  }
  return result;
}

// Renders the draft (PDF in a template, or Word) and hands it to the OS share sheet. A manual
// fetch because the endpoint is a POST that streams the file back; the bytes go to a cache file
// via base64 (RN's Blob-from-ArrayBuffer path is unreliable -- see generateInterviewQuestions in
// lib/api/applicant.ts), same as downloadReportExport does.
export async function downloadRenderedResume(draftId: string, templateId: string | null, format: 'pdf' | 'docx' = 'pdf'): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download your resume.');

  const res = await fetch(`${API_V1}${BASE}/${draftId}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify({ template_id: templateId, format }),
  });

  if (!res.ok) {
    let detail = 'Could not create the file. Please try again.';
    try {
      const errJson = await res.json();
      detail = errJson?.message || errJson?.detail || detail;
    } catch {
      // Body wasn't JSON — keep the default message.
    }
    throw new Error(detail);
  }

  const disposition = res.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
  const filename = (filenameMatch ? filenameMatch[1] : `resume.${format}`).replace(/[^A-Za-z0-9 _.-]/g, '');

  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  const mimeType = format === 'docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf';
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: 'Resume' });
  }
}
