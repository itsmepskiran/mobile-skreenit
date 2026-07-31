import { apiGet, apiPostJson } from '@/lib/api/client';

// Ported from sql-skreenit's dashboard/analysis.html + dashboard/js/analysis.js.
// Scope cut vs. web: the expandable "Communication Skills" sub-breakdown
// (grammar/vocabulary/sentence-complexity/readability) and PDF download are not
// ported -- the summary + per-question scores below are the primary value.
export interface AnalysisSummary {
  overall_score: number;
  speaking_pace: number;
  filler_words: number;
  face_presence: number;
  confidence_score: number;
  word_count: number;
  dominant_emotion: string;
  duration: number;
}

export interface QuestionAnalysis {
  question_index: number;
  question: string;
  cached: boolean;
  analysis: { summary: AnalysisSummary };
}

export interface CandidateAnalysisReport {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  job_title: string;
  job_id: string;
  applied_at: string;
  analyzed_at: string;
  task_id: string;
  analyses: QuestionAnalysis[];
  avg_score: number;
  avg_wpm: number;
  avg_filler: number;
  avg_face: number;
  dominant_emotion: string;
  total_questions: number;
}

export function getLatestAnalysisReports() {
  return apiGet<{ ok: boolean; data: CandidateAnalysisReport[] }>('/analytics/latest-reports');
}

export function bulkAnalyzeResponses(applicationIds: string[], jobId?: string) {
  return apiPostJson<{ ok: boolean; data: { task_id: string; status: string; message: string } }>(
    '/analytics/bulk-analyze-responses',
    { application_ids: applicationIds, job_id: jobId },
  );
}

export function reanalyzeApplication(applicationId: string) {
  return apiPostJson<{ ok: boolean; data: { task_id: string; status: string; message: string } }>(
    `/analytics/reanalyze/${applicationId}`,
    {},
  );
}

export function gradeFromScore(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'A+', color: '#2f855a' };
  if (score >= 80) return { label: 'A', color: '#2f855a' };
  if (score >= 70) return { label: 'B+', color: '#2b6cb0' };
  if (score >= 60) return { label: 'B', color: '#2b6cb0' };
  if (score >= 50) return { label: 'C', color: '#c05621' };
  if (score >= 40) return { label: 'D', color: '#c05621' };
  return { label: 'F', color: '#c53030' };
}
