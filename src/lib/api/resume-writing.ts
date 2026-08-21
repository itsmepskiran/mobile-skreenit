import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiGet, apiPostJson, apiUploadNative, type UploadFile } from '@/lib/api/client';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Resume Writing Services — free candidate feature with two entry points that converge
// on one AI-content -> template-render -> PDF-download flow. Mirrors the JD Writer
// background-task + polling pattern (src/lib/api/jd-writer.ts, (recruiter)/jd-writer.tsx),
// applied to resumes instead of job descriptions. See mac-skreenit/routers/resume_writing.py.

export interface ResumeExperienceInput {
  company?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ResumeEducationInput {
  degree?: string;
  institution?: string;
  year?: string;
}

export interface CreateFromScratchInput {
  fullName?: string;
  targetRole?: string;
  experience: ResumeExperienceInput[];
  education: ResumeEducationInput[];
  skills: string[];
  achievements: string[];
}

export interface ResumeAiContact {
  emails: string[];
  phones: string[];
  linkedin: string[];
  github: string[];
  website: string[];
}

export interface ResumeAiContent {
  contact_info?: ResumeAiContact;
  sections?: { summary?: string; experience?: string; education?: string };
  skills?: string[];
  improvement_notes?: { section: string; before: string; after: string }[];
  ats_keyword_suggestions?: string[];
}

export interface ResumeWritingDraft {
  id: string;
  source_type: 'upload' | 'scratch';
  title: string | null;
  template_id: string | null;
  // Legacy column, still present in the GET response but never populated by
  // /render anymore (see downloadRenderedResume below) — the backend renders
  // and streams the PDF fresh on every download instead of persisting to R2.
  pdf_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  ai_content?: ResumeAiContent;
  created_at: string;
  completed_at: string | null;
}

export function improveResume(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: { draft_id: string; status: string } }>(
    '/candidate/resume-writing/improve',
    file,
    'resume',
  );
}

export function createResumeFromScratch(input: CreateFromScratchInput) {
  return apiPostJson<{ ok: boolean; data: { draft_id: string; status: string } }>('/candidate/resume-writing/create', {
    full_name: input.fullName,
    target_role: input.targetRole,
    experience: input.experience,
    education: input.education,
    skills: input.skills,
    achievements: input.achievements,
  });
}

export function listResumeDrafts() {
  return apiGet<{ ok: boolean; data: ResumeWritingDraft[] }>('/candidate/resume-writing');
}

export function getResumeDraft(draftId: string) {
  return apiGet<{ ok: boolean; data: ResumeWritingDraft }>(`/candidate/resume-writing/${draftId}`);
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

// Renders + downloads a draft's PDF in one shot. Unlike downloadReportExport
// (lib/api/dashboard-metrics.ts), this can't use FileSystem.downloadAsync
// directly — that helper only issues GET requests, and this endpoint is a
// POST that takes a template_id body and streams the PDF bytes straight back
// (no more R2-persisted pdf_url — see routers/resume_writing.py's
// render_draft_to_pdf / mac-skreenit's resume_template_service.py). So this
// does a manual fetch, then writes the response bytes to a cache file via
// base64 (RN's Blob-from-ArrayBuffer path is unreliable — see the comment on
// generateInterviewQuestions in lib/api/applicant.ts) before handing it to
// the OS share sheet, same as downloadReportExport does.
export async function downloadRenderedResume(draftId: string, templateId: string): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download your resume.');

  const res = await fetch(`${API_V1}/candidate/resume-writing/${draftId}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify({ template_id: templateId }),
  });

  if (!res.ok) {
    let detail = 'Could not generate the CV. Please try again.';
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
  const filename = filenameMatch ? filenameMatch[1] : 'resume.pdf';

  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: 'Resume' });
  }
}
