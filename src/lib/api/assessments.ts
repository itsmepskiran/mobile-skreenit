import { apiGet } from '@/lib/api/client';

export interface CatalogEntry {
  service_key: string;
  service_type: 'general_plan' | 'assessment_bundle' | 'applicant_plan';
  name: string;
  description: string | null;
  assessment_format: string | null;
  icon_class: string | null;
  icon_color: string | null;
  icon_bg: string | null;
  industry_key: string | null;
  industry_label: string | null;
  skills_measured: string | null;
}

// Free + industry assessment catalog, sourced entirely from pricing_plans (see
// mac-skreenit's GET /premium/catalog and migrations 039/040) — no assessment is
// hardcoded on the client anymore, matching sql-skreenit's premium-features.js.
export function getAssessmentCatalog() {
  return apiGet<{ ok: boolean; data: { by_industry: Record<string, CatalogEntry[]>; total: number } }>(
    '/premium/catalog',
  );
}

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
