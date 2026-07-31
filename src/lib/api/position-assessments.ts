import { apiGet, apiPostJson, apiPut, apiUploadNative, type UploadFile } from '@/lib/api/client';

// Ported from mac-skreenit/routers/position_assessments.py + sql-skreenit's AI
// Assessment Wizard (dashboard/js/recruiter-dashboard.js). Gated behind the
// recruiter_plan subscription -- see (recruiter)/premium.tsx.
//
// Scope cut vs. web (deliberate): the wizard's third "Upload Your Own" tab
// (POST /jobs/{id}/custom-assessment, recruiter uploads their own assessment
// document) is not ported in this pass -- Recommended (JD-based) + Browse All
// cover the primary flow. custom_questions authoring is also not ported.

export interface AssessmentCatalogEntry {
  service_key: string;
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

export function browseAssessmentCatalog() {
  return apiGet<{ ok: boolean; data: { by_industry: Record<string, AssessmentCatalogEntry[]>; total: number } }>(
    '/recruiter/assessment-catalog/browse',
  );
}

export interface JdRecommendedAssessment extends AssessmentCatalogEntry {
  match_score: number;
}

export interface JdAnalysisResult {
  analysis: Record<string, unknown>;
  recommended: JdRecommendedAssessment[];
  catalog_total: number;
  from_cache: boolean;
}

export function analyzeJobDescription(jobId: string, file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: JdAnalysisResult }>(
    `/recruiter/jobs/${jobId}/jd-analysis`,
    file,
    'file',
  );
}

export interface AssessmentSelectionItem {
  type: 'catalog';
  key: string;
  label: string;
}

export function saveAssessmentConfig(jobId: string, selections: AssessmentSelectionItem[]) {
  return apiPut<{ ok: boolean; data: unknown }>(`/recruiter/jobs/${jobId}/assessment-config`, {
    body: { selected_assessments: selections, status: 'published' },
  });
}

export function getAssessmentConfig(jobId: string) {
  return apiGet<{ ok: boolean; data: Record<string, unknown> | null }>(`/recruiter/jobs/${jobId}/assessment-config`);
}

export interface ConfiguredAssessmentRow {
  job_id: string;
  job_title: string;
  jrf_number: string | null;
  reference_no: string | null;
  status: string;
  updated_at: string;
  assessments: { type: string; key?: string; uploaded_assessment_id?: string; label: string }[];
}

export function listAssessmentConfigs() {
  return apiGet<{ ok: boolean; data: ConfiguredAssessmentRow[] }>('/recruiter/assessment-configs');
}

// --- Move-to-Assessment invite -----------------------------------------------
// Ported from sql-skreenit's assets/assets/js/assessment-invite-modal.js. Always
// generates a single dedicated one-time link for exactly one known candidate
// (mode: 'per_candidate') -- the 'open'/'shared_gated' modes aren't used by any
// current web call site, so not ported here either.
export function generateAssessmentInviteLink(jobId: string, invitee: { fullName: string; email: string }) {
  return apiPostJson<{
    ok: boolean;
    data: { mode: string; invitees: { email: string; phone?: string; full_name: string; token: string }[] };
  }>(`/recruiter/jobs/${jobId}/assessment-link`, {
    mode: 'per_candidate',
    invitees: [{ full_name: invitee.fullName, email: invitee.email }],
  });
}
