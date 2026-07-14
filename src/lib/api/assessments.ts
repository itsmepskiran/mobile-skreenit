import { apiGet } from '@/lib/api/client';

export interface AssessmentSession {
  session_id: string;
  assessment_key: string;
  assessment_name: string;
  format: string;
  status: string;
  is_free: boolean;
  analysis_status: string;
  completed_at: string;
  mcq_score: number | null;
  mcq_total: number | null;
  overall_score: number | null;
}

// Read-only history list — taking a new assessment (MCQ/typing/video-response
// capture) needs camera/mic work that's deferred to Phase 3, same as the
// candidate profile's video introduction step.
export function listMyAssessments() {
  return apiGet<{ ok: boolean; data: AssessmentSession[] }>('/premium/my-assessments');
}
