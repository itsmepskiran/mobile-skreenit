import { getAtsSessionController } from '@/lib/auth/ats-session-controller';
import { API_V1 } from '@/lib/config';

// Client for the ATS Employer Console (routers/ats.py, mounted at /ats/*).
// A separate portal from the candidate/recruiter app with its own JWT (no
// refresh token — an 8-hour session) and its own 3-tier role model, so this
// mirrors lib/api/client.ts's shape but stays fully independent of it.

export class AtsApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : 'Request failed');
    this.status = status;
    this.detail = detail;
  }
}

export type AtsRole = 'super_admin' | 'admin' | 'user';

export const ATS_TIER: Record<AtsRole, number> = { super_admin: 3, admin: 2, user: 1 };

// Matches models/ats_models.py's ATS_MODULES exactly.
export const ATS_MODULES = [
  'departments',
  'designations',
  'positions',
  'employees',
  'requisitions',
  'jobs',
  'users',
  'assessments',
  'reports',
] as const;
export type AtsModule = (typeof ATS_MODULES)[number];
export type AtsRightAction = 'view' | 'create' | 'edit' | 'delete';
export type AtsRightsMatrix = Record<string, Partial<Record<AtsRightAction, boolean>>>;

export interface AtsUser {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: AtsRole;
  parent_id: string | null;
  department_id: string | null;
  rights: AtsRightsMatrix;
  status: 'active' | 'inactive';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string;
  generated_password?: string; // present once, only on the create-user response
}

export interface AtsDepartment {
  id: string;
  company_id: string;
  name: string;
  head_user_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AtsDesignation {
  id: string;
  company_id: string;
  title: string;
  level: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AtsPosition {
  id: string;
  company_id: string;
  department_id: string;
  designation_id: string;
  openings: number;
  filled_count: number;
  status: 'open' | 'on_hold' | 'closed';
  created_at: string;
  updated_at: string;
  department_name: string;
  designation_title: string;
}

export type AtsRequisitionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface AtsRequisition {
  id: string;
  company_id: string;
  department_id: string;
  position_id: string;
  requested_by: string;
  openings_requested: number;
  justification: string | null;
  status: AtsRequisitionStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  department_name: string;
  designation_title: string;
  requested_by_name: string;
  approved_by_name: string | null;
}

export type AtsJobStatus = 'draft' | 'open' | 'on_hold' | 'closed';

export interface AtsJob {
  id: string;
  jrf_number: string;
  reference_no: string;
  company_id: string;
  department_id: string;
  position_id: string;
  requisition_id: string;
  title: string;
  description: string | null;
  employment_type: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: AtsJobStatus;
  created_by: string;
  posted_at: string;
  applicants_count?: number;
  department_name?: string; // list responses only
}

export interface AtsEmployee {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  position_id: string | null;
  start_date: string | null;
  status: 'active' | 'on-leave' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AtsAssessmentCatalogItem {
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

export type AtsAssessmentSourceType = 'catalog' | 'custom' | 'mixed';
export type AtsAssessmentConfigStatus = 'draft' | 'published' | 'archived';

export interface AtsAssessmentConfig {
  id: string;
  ats_job_id: string;
  source_type: AtsAssessmentSourceType;
  catalog_assessment_key: string | null;
  section_config: unknown;
  total_duration_seconds: number | null;
  status: AtsAssessmentConfigStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

async function atsRequest<T>(path: string, init: RequestInit = {}, useAuth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (useAuth) {
    const token = getAtsSessionController().getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_V1}/ats${path}`, { ...init, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    if (res.status === 401 && useAuth) {
      // Bad/expired token — no refresh flow for the ATS session, force sign-out
      // exactly like web's ats-app.js `api()` does.
      await getAtsSessionController().signOut();
    }
    const detail = isJson && body && typeof body === 'object' && 'detail' in body ? body.detail : body;
    throw new AtsApiError(res.status, detail);
  }
  return body as T;
}

function atsGet<T>(path: string, useAuth = true) {
  return atsRequest<T>(path, { method: 'GET' }, useAuth);
}

function atsPostJson<T>(path: string, body?: unknown, useAuth = true) {
  return atsRequest<T>(
    path,
    body === undefined
      ? { method: 'POST' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    useAuth,
  );
}

function atsPutJson<T>(path: string, body: unknown) {
  return atsRequest<T>(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function atsDelete<T>(path: string) {
  return atsRequest<T>(path, { method: 'DELETE' });
}

interface Envelope<T> {
  ok: boolean;
  data: T;
}

// ---------------- Auth ----------------

export function atsLogin(loginId: string, password: string) {
  return atsPostJson<Envelope<{ access_token: string; user: AtsUser }>>(
    '/login',
    { login_id: loginId, password },
    false,
  );
}

export function atsMe() {
  return atsGet<Envelope<AtsUser>>('/me');
}

// ---------------- Departments ----------------

export const listAtsDepartments = () => atsGet<Envelope<AtsDepartment[]>>('/departments');
export const createAtsDepartment = (payload: { name: string; head_user_id?: string | null }) =>
  atsPostJson<Envelope<AtsDepartment>>('/departments', payload);
export const updateAtsDepartment = (
  id: string,
  payload: Partial<{ name: string; head_user_id: string | null; status: 'active' | 'inactive' }>,
) => atsPutJson<Envelope<AtsDepartment>>(`/departments/${id}`, payload);
export const deleteAtsDepartment = (id: string) => atsDelete<Envelope<null>>(`/departments/${id}`);

// ---------------- Designations ----------------

export const listAtsDesignations = () => atsGet<Envelope<AtsDesignation[]>>('/designations');
export const createAtsDesignation = (payload: { title: string; level?: string | null; description?: string | null }) =>
  atsPostJson<Envelope<AtsDesignation>>('/designations', payload);
export const updateAtsDesignation = (
  id: string,
  payload: Partial<{ title: string; level: string | null; description: string | null; status: 'active' | 'inactive' }>,
) => atsPutJson<Envelope<AtsDesignation>>(`/designations/${id}`, payload);
export const deleteAtsDesignation = (id: string) => atsDelete<Envelope<null>>(`/designations/${id}`);

// ---------------- Positions ----------------

export const listAtsPositions = () => atsGet<Envelope<AtsPosition[]>>('/positions');
export const createAtsPosition = (payload: { department_id: string; designation_id: string; openings: number }) =>
  atsPostJson<Envelope<AtsPosition>>('/positions', payload);
export const updateAtsPosition = (
  id: string,
  payload: Partial<{
    department_id: string;
    designation_id: string;
    openings: number;
    status: 'open' | 'on_hold' | 'closed';
  }>,
) => atsPutJson<Envelope<AtsPosition>>(`/positions/${id}`, payload);
export const deleteAtsPosition = (id: string) => atsDelete<Envelope<null>>(`/positions/${id}`);

// ---------------- Requisitions ----------------

export function listAtsRequisitions(status?: AtsRequisitionStatus) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return atsGet<Envelope<AtsRequisition[]>>(`/requisitions${qs}`);
}
export const createAtsRequisition = (payload: {
  department_id: string;
  position_id: string;
  openings_requested: number;
  justification?: string;
}) => atsPostJson<Envelope<AtsRequisition>>('/requisitions', payload);
export const approveAtsRequisition = (id: string) => atsPostJson<Envelope<AtsRequisition>>(`/requisitions/${id}/approve`);
export const rejectAtsRequisition = (id: string, rejectionReason: string) =>
  atsPostJson<Envelope<AtsRequisition>>(`/requisitions/${id}/reject`, { rejection_reason: rejectionReason });
export const withdrawAtsRequisition = (id: string) => atsPostJson<Envelope<AtsRequisition>>(`/requisitions/${id}/withdraw`);

// ---------------- Jobs ----------------

export function listAtsJobs(opts: { status?: AtsJobStatus; search?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.search) params.set('search', opts.search);
  const qs = params.toString();
  return atsGet<Envelope<AtsJob[]>>(`/jobs${qs ? `?${qs}` : ''}`);
}
export const createAtsJob = (payload: {
  requisition_id: string;
  title: string;
  description?: string;
  employment_type?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
}) => atsPostJson<Envelope<AtsJob>>('/jobs', payload);
export const updateAtsJob = (
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    employment_type: string;
    location: string;
    salary_min: number;
    salary_max: number;
    status: AtsJobStatus;
  }>,
) => atsPutJson<Envelope<AtsJob>>(`/jobs/${id}`, payload);

// ---------------- Employees ----------------

export const listAtsEmployees = () => atsGet<Envelope<AtsEmployee[]>>('/employees');
export const createAtsEmployee = (payload: {
  name: string;
  email?: string;
  phone?: string;
  department_id?: string | null;
  position_id?: string | null;
  start_date?: string | null;
}) => atsPostJson<Envelope<AtsEmployee>>('/employees', payload);
export const updateAtsEmployee = (
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    phone: string;
    department_id: string | null;
    position_id: string | null;
    start_date: string | null;
    status: 'active' | 'on-leave' | 'inactive';
  }>,
) => atsPutJson<Envelope<AtsEmployee>>(`/employees/${id}`, payload);
export const deleteAtsEmployee = (id: string) => atsDelete<Envelope<null>>(`/employees/${id}`);

// ---------------- Company users ----------------

export const listAtsUsers = () => atsGet<Envelope<AtsUser[]>>('/users');
export const createAtsUser = (payload: {
  name: string;
  email: string;
  role: 'admin' | 'user';
  department_id?: string | null;
  rights?: AtsRightsMatrix;
}) => atsPostJson<Envelope<AtsUser>>('/users', payload);
export const updateAtsUser = (
  id: string,
  payload: Partial<{ name: string; department_id: string | null; status: 'active' | 'inactive'; rights: AtsRightsMatrix }>,
) => atsPutJson<Envelope<AtsUser>>(`/users/${id}`, payload);
export const deleteAtsUser = (id: string) => atsDelete<Envelope<null>>(`/users/${id}`);

// ---------------- Assessment linking ----------------

export const listAtsAssessmentCatalog = () => atsGet<Envelope<AtsAssessmentCatalogItem[]>>('/assessment-catalog');
export const getAtsJobAssessmentConfig = (jobId: string) =>
  atsGet<Envelope<AtsAssessmentConfig | null>>(`/jobs/${jobId}/assessment-config`);
export const putAtsJobAssessmentConfig = (
  jobId: string,
  payload: {
    source_type: AtsAssessmentSourceType;
    catalog_assessment_key?: string | null;
    status: AtsAssessmentConfigStatus;
  },
) => atsPutJson<Envelope<AtsAssessmentConfig>>(`/jobs/${jobId}/assessment-config`, payload);
