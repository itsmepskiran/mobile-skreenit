import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError, apiGet, apiUploadNative, type UploadFile } from '@/lib/api/client';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Ported from sql-skreenit/recruiter/js/resume-analysis.js. Standalone, ad-hoc
// resume upload -> AI analysis tool — not tied to any existing application/job,
// and not gated behind the recruiter_plan subscription (only the "Detailed
// Analysis" sub-feature below is). No client-side timeout override needed:
// unlike the web client (15s default), this app's apiUploadNative has none.
//
// Scope cut vs. web (deliberate, not an oversight): the full "Detailed Analysis"
// flow (POST /recruiter/detailed-analysis/start + polling report screen) is not
// ported in this pass — it depends on the Recruiter Premium gate being built
// first. Only checkDetailedAnalysisAccess() is wired here so the screen can show
// a locked state; the actual start/report flow is a follow-up. The detailed PDF
// *download* (below) is ported since it just renders the already-fetched
// insights/questions server-side, same as the basic report.

export interface InterviewQuestion {
  question: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
}

export interface ResumeInsightsStats {
  word_count: number;
  skills_count: number;
  estimated_experience_years: number | null;
  profile_completeness_pct: number;
}

export interface ResumeInsightsContact {
  emails: string[];
  phones: string[];
  linkedin: string[];
  github: string[];
  website: string[];
}

export interface ResumeSkillDepth {
  skill: string;
  depth_signal: string;
  reasoning: string;
}

export interface ResumeInsights {
  summary: string;
  name: string | null;
  stats: ResumeInsightsStats;
  contact: ResumeInsightsContact;
  skills: string[];
  domains: string[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  skills_depth?: ResumeSkillDepth[];
  communication_signals?: string;
  career_trajectory?: string;
  analysis_source?: 'ai' | 'rule-based';
}

export interface ResumeAnalysisResult {
  questions: InterviewQuestion[];
  source: 'ai' | 'fallback';
  model?: string;
  reason?: string;
  insights: ResumeInsights;
}

export function analyzeResume(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: ResumeAnalysisResult }>(
    '/recruiter/analyze-resume-questions',
    file,
    'resume',
  );
}

export function checkDetailedAnalysisAccess() {
  return apiGet<{ ok: boolean; data: { accessible: boolean } }>('/recruiter/detailed-analysis/access');
}

export interface DetailedReportPayload {
  resume_filename: string;
  insights: ResumeInsights;
  questions: InterviewQuestion[];
  source?: string;
  model?: string;
  reason?: string;
}

// Backend route (routers/recruiter_new.py: POST /recruiter/analyze-resume-questions/detailed-report)
// renders the cached insights/questions into a PDF via generate_deep_analysis_report() —
// no re-analysis happens, this is just a fast PDF build off data the frontend already has.
// Gated behind the same "detailed_report" paid feature as checkDetailedAnalysisAccess()
// above; the backend returns 402 if the recruiter isn't subscribed.
//
// Unlike downloadReportExport() in dashboard-metrics.ts, this endpoint is a POST with a
// JSON body, and expo-file-system's downloadAsync only supports GET (no request body) —
// so this fetches the PDF bytes directly, base64-encodes them, and writes them to a local
// cache file before handing off to expo-sharing, instead of using downloadAsync.
export async function downloadDetailedReport(payload: DetailedReportPayload): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download reports.');

  const res = await fetch(`${API_V1}/recruiter/analyze-resume-questions/detailed-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
    let detail: unknown = body;
    if (isJson && body && typeof body === 'object') {
      if ('message' in body) detail = (body as Record<string, unknown>).message;
      else if ('detail' in body) detail = (body as Record<string, unknown>).detail;
    }
    throw new ApiError(res.status, detail ?? 'Report generation failed');
  }

  const buffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  const safeName = (payload.resume_filename || 'resume').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const localUri = `${FileSystem.cacheDirectory}${safeName}_detailed_analysis_report.pdf`;
  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: 'Detailed Analysis Report' });
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += BASE64_CHARS[bytes[i + 2] & 63];
  }
  if (i < bytes.length) {
    result += BASE64_CHARS[bytes[i] >> 2];
    if (i + 1 < bytes.length) {
      result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      result += BASE64_CHARS[(bytes[i + 1] & 15) << 2];
      result += '=';
    } else {
      result += BASE64_CHARS[(bytes[i] & 3) << 4];
      result += '==';
    }
  }
  return result;
}
