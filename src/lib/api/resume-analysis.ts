import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError, apiGet, apiPostJson, apiUploadNative, pollAsyncJob, type UploadFile } from '@/lib/api/client';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Ported from sql-skreenit/recruiter/js/resume-analysis.js. Standalone, ad-hoc
// resume upload -> AI analysis tool — not tied to any existing application/job,
// and not gated behind the recruiter_plan subscription (only the "Detailed
// Analysis" sub-feature below is).
//
// The actual analysis (parse + two sequential Ollama calls) can take up to
// ~220s. Web copes by raising its request timeout to 240000ms per-call, but
// apiUploadNative's native upload transport (expo-file-system's
// FileSystem.uploadAsync) has no equivalent request-timeout override, and was
// hitting the OS's shorter default before the backend finished — resume
// analysis would appear to silently fail on mobile. So mobile submits to the
// async job endpoint (routers/recruiter_new.py: POST .../analyze-resume-questions/async,
// which returns a job_id almost immediately) and polls GET .../async/{job_id}
// until it reports "completed", instead of holding one long request open.

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

export async function analyzeResume(file: UploadFile): Promise<{ ok: boolean; data: ResumeAnalysisResult }> {
  const submitRes = await apiUploadNative<{ ok: boolean; data: { job_id: string; status: string } }>(
    '/recruiter/analyze-resume-questions/async',
    file,
    'resume',
  );
  const jobId = submitRes.data.job_id;
  const data = await pollAsyncJob<ResumeAnalysisResult>(() =>
    apiGet(`/recruiter/analyze-resume-questions/async/${jobId}`),
  );
  return { ok: true, data };
}

export function checkDetailedAnalysisAccess() {
  return apiGet<{ ok: boolean; data: { accessible: boolean } }>('/recruiter/detailed-analysis/access');
}

// Detailed Analysis job-matching flow (routers/detailed_analysis.py): a recruiter
// picks one of their jobs, we issue a per-candidate assessment invite link behind
// the scenes, and once the candidate completes it, /status merges the resume
// snapshot with their assessment results into merged_report.
export interface DetailedAnalysisAssessmentResult {
  session_id: string;
  assessment_key: string;
  assessment_title: string;
  score: number;
  summary: string;
}

export interface DetailedAnalysisRequest {
  id: string;
  job_id: string;
  candidate_name: string;
  candidate_email: string;
  status: 'awaiting_assessment' | 'processing' | 'completed' | 'failed';
  progress?: { all_completed?: boolean } | null;
  merged_report?: {
    resume_insights: ResumeInsights;
    assessment_results: DetailedAnalysisAssessmentResult[];
  } | null;
  created_at?: string;
}

export function startDetailedAnalysis(input: {
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  insights: ResumeInsights;
}) {
  return apiPostJson<{ ok: boolean; data: { detailed_analysis_id: string; assessment_token: string } }>(
    '/recruiter/detailed-analysis/start',
    {
      job_id: input.jobId,
      candidate_name: input.candidateName,
      candidate_email: input.candidateEmail,
      resume_insights_snapshot: input.insights,
    },
  );
}

export function getDetailedAnalysisStatus(requestId: string) {
  return apiGet<{ ok: boolean; data: DetailedAnalysisRequest }>(`/recruiter/detailed-analysis/${requestId}/status`);
}

// Unlike the basic/detailed resume reports above, this is a GET, so
// expo-file-system's downloadAsync (GET-only) can fetch it directly instead of
// the manual fetch->base64 roundtrip those need for their POST bodies.
export async function downloadDetailedAnalysisReport(requestId: string): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download reports.');

  const localUri = `${FileSystem.cacheDirectory}detailed_analysis_${requestId}.pdf`;
  const result = await FileSystem.downloadAsync(`${API_V1}/recruiter/detailed-analysis/${requestId}/download`, localUri, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  if (result.status !== 200) {
    throw new ApiError(result.status, 'Detailed analysis is not ready yet.');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: 'Detailed Analysis Report' });
  }
}

export interface DetailedReportPayload {
  resume_filename: string;
  insights: ResumeInsights;
  questions: InterviewQuestion[];
  source?: string;
  model?: string;
  reason?: string;
}

// Shared by downloadBasicReport/downloadDetailedReport below. Both backend routes
// (routers/recruiter_new.py: POST /recruiter/analyze-resume-questions/{basic,detailed}-report)
// render the already-fetched insights/questions into a PDF server-side — no
// re-analysis happens, this is just a fast PDF build off data the frontend already has.
//
// Unlike downloadReportExport() in dashboard-metrics.ts, these endpoints are POSTs with a
// JSON body, and expo-file-system's downloadAsync only supports GET (no request body) —
// so this fetches the PDF bytes directly, base64-encodes them, and writes them to a local
// cache file before handing off to expo-sharing, instead of using downloadAsync.
async function downloadReportPdf(
  endpointPath: string,
  payload: DetailedReportPayload,
  fileSuffix: string,
  dialogTitle: string,
): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download reports.');

  const res = await fetch(`${API_V1}${endpointPath}`, {
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
  const localUri = `${FileSystem.cacheDirectory}${safeName}_${fileSuffix}.pdf`;
  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle });
  }
}

// Free — no "detailed_report" feature gate, unlike downloadDetailedReport below.
export function downloadBasicReport(payload: DetailedReportPayload): Promise<void> {
  return downloadReportPdf('/recruiter/analyze-resume-questions/basic-report', payload, 'basic_report', 'Basic Report');
}

// Gated behind the "detailed_report" paid feature checked by checkDetailedAnalysisAccess()
// above; the backend returns 402 if the recruiter isn't subscribed.
export function downloadDetailedReport(payload: DetailedReportPayload): Promise<void> {
  return downloadReportPdf(
    '/recruiter/analyze-resume-questions/detailed-report',
    payload,
    'detailed_analysis_report',
    'Detailed Analysis Report',
  );
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
