import { apiGet, apiPostJson, pollAsyncJob } from '@/lib/api/client';

// Mirrors sql-skreenit/Assessments/js/assessment.js + routers/premium_assessment.py.

export type ExerciseType =
  | 'mcq'
  | 'code'
  | 'text_response'
  | 'vocabulary'
  | 'read_aloud'
  | 'repeat_sentence'
  | 'qa_verbal'
  | 'topic_speaking'
  | 'voice_scenario';

export interface AssessmentItem {
  id: string;
  content: string;
  options?: string[];
  correct?: number;
  context?: string;
  language?: string;
  starter_code?: string;
  format_hint?: string;
}

export interface AssessmentSection {
  id: string;
  title: string;
  instruction?: string;
  exercise_type: ExerciseType;
  duration_per_item?: number;
  format_hint?: string;
  items: AssessmentItem[];
}

export interface AssessmentQuestions {
  assessment_key: string;
  assessment_name: string;
  format: string;
  format_description: string;
  sections: AssessmentSection[];
  total_duration: number;
  mcq_token: string | null;
}

// Ollama generation here can take 60-180s — the plain fetch() behind apiGet
// has no AbortController/timeout override the way web's client does, so this
// submits to the async job endpoint and polls instead of holding one request
// open (see routers/premium_assessment.py's /assessment-questions/async pair).
export async function getAssessmentQuestions(
  planId: string,
  platform?: string,
  jobId?: string,
): Promise<{ ok: boolean; data: AssessmentQuestions }> {
  const params = new URLSearchParams({ planId, mode: planId });
  if (platform) params.set('platform', platform);
  if (jobId) params.set('job_id', jobId);

  const submitRes = await apiPostJson<{ ok: boolean; data: { job_id: string; status: string } }>(
    `/premium/assessment-questions/async?${params.toString()}`,
    {},
  );
  const asyncJobId = submitRes.data.job_id;
  const data = await pollAsyncJob<AssessmentQuestions>(() =>
    apiGet(`/premium/assessment-questions/async/${asyncJobId}`),
  );
  return { ok: true, data };
}

export interface AssessmentResponseInput {
  questionId: string;
  type: string;
  text: string | null;
  hasRecording: boolean;
  selectedIdx: number | null;
  // R2 URL of an uploaded voice/video recording, if any (premium_assessment_models.py).
  recordingUrl?: string | null;
}

export interface FinishAssessmentInput {
  planId: string;
  responses: AssessmentResponseInput[];
  timeTakenSeconds: number;
  mcqToken: string | null;
}

export function finishAssessment(input: FinishAssessmentInput) {
  return apiPostJson<{
    ok: boolean;
    data: {
      session_id: string;
      status: string;
      is_free: boolean;
      analysis_status: string;
      mcq_score: number | null;
      mcq_total: number | null;
    };
  }>('/premium/assessment-finish', {
    planId: input.planId,
    mode: input.planId,
    responses: input.responses,
    timeTakenSeconds: input.timeTakenSeconds,
    mcqToken: input.mcqToken,
  });
}

export interface AssessmentResponseFeedback {
  question_index?: number;
  feedback?: string;
  [key: string]: unknown;
}

export interface AssessmentSkillBreakdown {
  skill: string;
  score: number;
  note: string;
}

export interface AssessmentAiFeedback {
  overall_score: number | null;
  overall_grade?: string;
  grade_label?: string;
  grade_color?: string;
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  skill_breakdown?: AssessmentSkillBreakdown[];
  response_feedback: AssessmentResponseFeedback[];
  trait_profile?: Record<string, number>;
  work_style?: string;
  recommended_environments?: string[];
  is_psychometric?: boolean;
}

export interface AssessmentResult {
  session_id: string;
  assessment_key: string;
  assessment_name: string;
  format: string;
  status: string;
  is_free: boolean;
  analysis_status: 'pending' | 'completed' | 'failed';
  completed_at: string;
  total_exercises: number;
  time_taken_seconds: number | null;
  mcq_score: number | null;
  mcq_total: number | null;
  overall_score: number | null;
  reviewer_notes: string | null;
  ai_feedback: AssessmentAiFeedback | null;
  responses: unknown[];
}

export function getAssessmentResult(sessionId: string) {
  return apiGet<{ ok: boolean; data: AssessmentResult }>(`/premium/assessment-results/${sessionId}`);
}

export interface VideoIntroQuestion {
  index: number;
  text: string;
  duration: number;
}

export function getVideoIntroQuestions() {
  return apiGet<{ ok: boolean; data: { questions: VideoIntroQuestion[]; assessment_name: string } }>(
    '/premium/video-intro-questions',
  );
}
