import { apiGet, apiPostJson } from '@/lib/api/client';

// Ported from sql-skreenit/dashboard/js/recruiter-dashboard.js's JD Writer section
// (openJdWriterModal/generateJd/loadAvailableJds). Generates a job description
// from scratch via a background AI job -- no job record is created. Unlike web
// (which renders the result to a downloadable PDF via jd-pdf.js), this app shows
// the generated content as text with a native Share sheet -- no PDF-generation
// library is pulled in for this pass (deliberate scope cut).
export interface JdWriterInput {
  jobTitle: string;
  department?: string;
  industry?: string;
  companyName?: string;
  aboutCompany?: string;
  seniority?: string;
  experienceMin?: number;
  experienceMax?: number;
  employmentType?: string;
  workLocation?: string;
  reportsTo?: string;
  coreResponsibilities?: string[];
  mustHaveSkills?: string[];
  qualification?: string;
  competencies?: string[];
}

export interface JdGeneratedContent {
  position_overview: string;
  about_company?: string;
  key_responsibilities: { category: string; bullets: string[] }[];
  qualifications: { label: string; text: string }[];
  key_competencies: string[];
}

export interface JdWriterRecord {
  id: string;
  job_title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_content?: JdGeneratedContent;
  form_inputs?: Record<string, unknown>;
  created_at: string;
}

export function generateJd(input: JdWriterInput) {
  return apiPostJson<{ ok: boolean; data: { id: string } }>('/recruiter/jobs/jd-writer/generate', {
    job_title: input.jobTitle,
    department: input.department,
    industry: input.industry,
    company_name: input.companyName,
    about_company: input.aboutCompany,
    seniority: input.seniority,
    experience_min: input.experienceMin ?? null,
    experience_max: input.experienceMax ?? null,
    employment_type: input.employmentType,
    work_location: input.workLocation,
    reports_to: input.reportsTo,
    core_responsibilities: input.coreResponsibilities ?? [],
    must_have_skills: input.mustHaveSkills ?? [],
    qualification: input.qualification,
    competencies: input.competencies ?? [],
  });
}

export function listGeneratedJds() {
  return apiGet<{ ok: boolean; data: JdWriterRecord[] }>('/recruiter/jobs/jd-writer');
}

export function getGeneratedJd(id: string) {
  return apiGet<{ ok: boolean; data: JdWriterRecord }>(`/recruiter/jobs/jd-writer/${id}`);
}
