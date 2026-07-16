import { apiGet, apiPostJson } from '@/lib/api/client';

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

export function getAssessmentQuestions(planId: string, platform?: string) {
  const params = new URLSearchParams({ planId, mode: planId });
  if (platform) params.set('platform', platform);
  return apiGet<{ ok: boolean; data: AssessmentQuestions }>(`/premium/assessment-questions?${params.toString()}`);
}

export interface AssessmentResponseInput {
  questionId: string;
  type: string;
  text: string | null;
  hasRecording: boolean;
  selectedIdx: number | null;
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

export interface AssessmentAiFeedback {
  overall_score: number | null;
  overall_grade?: string;
  grade_label?: string;
  grade_color?: string;
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
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
