import { apiDelete, apiGet, apiPostJson, apiPut, apiUploadNative, pollAsyncJob, type UploadFile } from '@/lib/api/client';

// Ported from mac-skreenit/routers/position_assessments.py + sql-skreenit's AI
// Assessment Wizard (dashboard/js/recruiter-dashboard.js). Gated behind the
// recruiter_plan subscription -- see (recruiter)/premium.tsx.
//
// custom_questions (question-by-question authoring) is not ported -- that lives
// only in the separate /ats/ portal on web, a different product with its own
// login, out of scope here.

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

// The Ollama extraction this triggers can take 30-90s — apiUploadNative's
// native upload transport has no timeout override to cover that, so this
// submits to the async job endpoint and polls instead of holding one request
// open (see routers/position_assessments.py's /jd-analysis/async pair).
export async function analyzeJobDescription(jobId: string, file: UploadFile): Promise<{ ok: boolean; data: JdAnalysisResult }> {
  const submitRes = await apiUploadNative<{ ok: boolean; data: { job_id: string; status: string } }>(
    `/recruiter/jobs/${jobId}/jd-analysis/async`,
    file,
    'file',
  );
  const asyncJobId = submitRes.data.job_id;
  const data = await pollAsyncJob<JdAnalysisResult>(() =>
    apiGet(`/recruiter/jobs/${jobId}/jd-analysis/async/${asyncJobId}`),
  );
  return { ok: true, data };
}

export type AssessmentSelectionItem =
  | { type: 'catalog'; key: string; label: string }
  | { type: 'custom'; uploaded_assessment_id: string; label: string };

export function saveAssessmentConfig(jobId: string, selections: AssessmentSelectionItem[]) {
  return apiPut<{ ok: boolean; data: unknown }>(`/recruiter/jobs/${jobId}/assessment-config`, {
    body: { selected_assessments: selections, status: 'published' },
  });
}

// Recruiter uploads their own assessment document (POST .../custom-assessment) —
// the backend uploads it to R2, extracts its text, and returns an id/title to
// reference from a saveAssessmentConfig() selection (type: 'custom'). No
// discrete question extraction happens server-side, unlike catalog assessments.
export interface UploadedAssessment {
  id: string;
  title: string;
}

// Uploads to R2 then runs an Ollama extraction pass — same timeout risk as
// analyzeJobDescription above, same fix: submit + poll instead of one long
// held-open native upload.
export async function uploadCustomAssessment(
  jobId: string,
  file: UploadFile,
  title?: string,
): Promise<{ ok: boolean; data: UploadedAssessment }> {
  const submitRes = await apiUploadNative<{ ok: boolean; data: { job_id: string; status: string } }>(
    `/recruiter/jobs/${jobId}/custom-assessment/async`,
    file,
    'file',
    title ? { title } : {},
  );
  const asyncJobId = submitRes.data.job_id;
  const data = await pollAsyncJob<UploadedAssessment>(() =>
    apiGet(`/recruiter/jobs/${jobId}/custom-assessment/async/${asyncJobId}`),
  );
  return { ok: true, data };
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
// (mode: 'per_candidate') -- the quick single-candidate flow reused from
// Applications review and Candidate Search. See generateAssessmentLink below
// for the fuller open/gated/bulk-invite version (recruiter-dashboard.js's
// "Configured Assessments" share-link modal).
export function generateAssessmentInviteLink(jobId: string, invitee: { fullName: string; email: string }) {
  return apiPostJson<{
    ok: boolean;
    data: { mode: string; invitees: { email: string; phone?: string; full_name: string; token: string }[] };
  }>(`/recruiter/jobs/${jobId}/assessment-link`, {
    mode: 'per_candidate',
    invitees: [{ full_name: invitee.fullName, email: invitee.email }],
  });
}

// --- Assessment link modes (open / per-candidate / shared-gated) ------------
// Ported from sql-skreenit's dashboard/js/recruiter-dashboard.js
// openLinkShareModal + generateOpenLink/generateInvites/loadInvitees/revoke.
export type AssessmentLinkMode = 'open' | 'per_candidate' | 'shared_gated';

export interface AssessmentLinkInviteeInput {
  fullName?: string;
  email?: string;
  phone?: string;
}

export type GenerateAssessmentLinkResult =
  | { mode: 'open'; token: string }
  | { mode: 'shared_gated'; token: string }
  | { mode: 'per_candidate'; invitees: { email?: string; phone?: string; full_name?: string; token: string }[] };

export function generateAssessmentLink(
  jobId: string,
  input: { mode: AssessmentLinkMode; invitees?: AssessmentLinkInviteeInput[] },
) {
  return apiPostJson<{ ok: boolean; data: GenerateAssessmentLinkResult }>(`/recruiter/jobs/${jobId}/assessment-link`, {
    mode: input.mode,
    invitees: input.invitees?.map((i) => ({ full_name: i.fullName, email: i.email, phone: i.phone })),
  });
}

export interface AssessmentInvitee {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  status: string; // 'invited' | 'used'
  created_at: string;
  used_at: string | null;
  token: string;
  link_type: string; // 'reusable' (open) | 'single_use' (per_candidate) | 'gated' (shared_gated)
}

export function listAssessmentInvitees(jobId: string) {
  return apiGet<{ ok: boolean; data: AssessmentInvitee[] }>(`/recruiter/jobs/${jobId}/assessment-invitees`);
}

export function revokeAssessmentInvitee(jobId: string, inviteeId: string) {
  return apiDelete<{ ok: boolean; message: string }>(`/recruiter/jobs/${jobId}/assessment-invitees/${inviteeId}`);
}
