import { apiGet, apiUploadNative, type UploadFile } from '@/lib/api/client';

// Ported from sql-skreenit/recruiter/js/resume-analysis.js. Standalone, ad-hoc
// resume upload -> AI analysis tool — not tied to any existing application/job,
// and not gated behind the recruiter_plan subscription (only the "Detailed
// Analysis" sub-feature below is). No client-side timeout override needed:
// unlike the web client (15s default), this app's apiUploadNative has none.
//
// Scope cut vs. web (deliberate, not an oversight): "Download Basic Report" (PDF)
// and the full "Detailed Analysis" flow (POST /recruiter/detailed-analysis/start
// + polling report screen) are not ported in this pass — the former needs a new
// binary-response client helper + expo-sharing, the latter depends on the
// Recruiter Premium gate being built first (same session, later item). Only
// checkDetailedAnalysisAccess() is wired here so the screen can show a locked
// state; the actual start/report flow is a follow-up.

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
