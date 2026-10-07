import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiGet, apiPostJson, apiUploadNative, ApiError, type UploadFile } from '@/lib/api/client';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Mock Interview Practice (role-based) and Intro Video Analysis (resume-based) share one engine:
// a session of questions, each answered on video, analysed in the background, and rolled into
// a report. See mac-skreenit routers/mock_interview.py and routers/intro_video_analysis.py.

export type AnswerStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface AnswerAnalysis {
  summary?: {
    overall_score?: number;
    overall_grade?: string;
    speaking_pace?: number;
    filler_words?: number;
    eye_contact_rate?: number;
    dominant_emotion?: string;
  };
  assessment?: {
    strengths?: { label: string; highlight?: string }[];
    areas_for_improvement?: { label: string; suggestion?: string }[];
  };
  transcript?: string;
}

export interface InterviewAnswer {
  question_index: number;
  question: string;
  status: AnswerStatus;
  overall_score: number | null;
  analysis: AnswerAnalysis | null;
  error: string | null;
}

export interface InterviewSession {
  id: string;
  kind: 'mock' | 'intro';
  target_role: string;
  experience_level: string | null;
  status: 'in_progress' | 'completed';
  overall_score: number | null;
  max_minutes: number | null;
  // Per-answer recording limit in seconds (plan interview length split across the questions).
  answer_seconds: number | null;
  charge_source: 'free' | 'plan' | 'coins' | null;
  created_at: string | null;
  answers: InterviewAnswer[];
}

export interface SessionSummary {
  id: string;
  target_role: string;
  status: 'in_progress' | 'completed';
  overall_score: number | null;
  question_count: number;
  created_at: string | null;
}

type Api<T> = { ok: boolean; data: T };

// ── Mock interview ─────────────────────────────────────────────────────
export interface MockQuote {
  method: 'free' | 'unlimited' | 'coins' | 'blocked';
  source: 'plan' | 'free' | 'coins' | 'daily_limit';
  coins_required: number;
  balance: number;
  sufficient: boolean;
  max_minutes: number | null;
  plan_name: string | null;
  plan_remaining: number | null;
  plan_limit: number | null;
  daily_limit: number | null;
  exhausted_plan: string | null;
}

export interface InterviewRole {
  job_id: string;
  title: string;
}

export const getMockQuote = () => apiGet<Api<MockQuote>>('/candidate/mock-interview/quote');
export const listMockRoles = () => apiGet<Api<InterviewRole[]>>('/candidate/mock-interview/roles');
export const listMockSessions = () => apiGet<Api<SessionSummary[]>>('/candidate/mock-interview');
export const getMockSession = (id: string) => apiGet<Api<InterviewSession>>(`/candidate/mock-interview/${id}`);
export const startMockSession = (input: {
  job_id?: string | null;
  target_role?: string | null;
  experience_level?: string | null;
  question_count: number;
}) => apiPostJson<Api<InterviewSession>>('/candidate/mock-interview/start', input);

export function submitMockAnswer(sessionId: string, questionIndex: number, file: UploadFile) {
  return apiUploadNative<Api<{ status: string }>>(`/candidate/mock-interview/${sessionId}/answer/${questionIndex}`, file, 'file');
}

// ── Intro video analysis ───────────────────────────────────────────────
export interface IntroStatus {
  has_resume: boolean;
  resume_name: string | null;
  resume_analyzed: boolean;
  quote: {
    method: 'free' | 'unlimited' | 'coins';
    coins_required: number;
    balance: number;
    sufficient: boolean;
  };
  current: InterviewSession | null;
  latest: InterviewSession | null;
}

export const getIntroStatus = () => apiGet<Api<IntroStatus>>('/candidate/intro-analysis/status');
export const listIntroSessions = () => apiGet<Api<SessionSummary[]>>('/candidate/intro-analysis');
export const getLatestIntroAnalysis = () => apiGet<Api<InterviewSession | null>>('/candidate/intro-analysis/latest');
export const startIntroSession = () => apiPostJson<Api<InterviewSession>>('/candidate/intro-analysis/start', {});
export const getIntroSession = (id: string) => apiGet<Api<InterviewSession>>(`/candidate/intro-analysis/${id}`);

export function submitIntroAnswer(sessionId: string, questionIndex: number, file: UploadFile) {
  return apiUploadNative<Api<{ status: string }>>(`/candidate/intro-analysis/${sessionId}/answer/${questionIndex}`, file, 'file');
}

// ── Report download (shared by both) ───────────────────────────────────
// The PDF sits behind the auth header, so download it natively with the token, then hand it to
// the OS share sheet (same approach as lib/api/employability-report.ts).
export async function downloadSessionReport(kind: 'mock' | 'intro', sessionId: string): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download your report.');
  const base = kind === 'mock' ? 'mock-interview' : 'intro-analysis';
  const localUri = `${FileSystem.cacheDirectory}${kind === 'mock' ? 'mock_interview' : 'intro_video_analysis'}_${sessionId}.pdf`;
  const res = await FileSystem.downloadAsync(`${API_V1}/candidate/${base}/${sessionId}/report`, localUri, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (res.status !== 200) {
    throw new ApiError(res.status, 'Could not generate the report. Please try again.');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Video analysis report' });
  }
}
