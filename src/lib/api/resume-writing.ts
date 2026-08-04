import { apiGet, apiPostJson, apiUploadNative, type UploadFile } from '@/lib/api/client';

// Resume Writing Services — free candidate feature with two entry points that converge
// on one AI-content -> template-render -> PDF-download flow. Mirrors the JD Writer
// background-task + polling pattern (src/lib/api/jd-writer.ts, (recruiter)/jd-writer.tsx),
// applied to resumes instead of job descriptions. See mac-skreenit/routers/resume_writing.py.

export interface ResumeExperienceInput {
  company?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ResumeEducationInput {
  degree?: string;
  institution?: string;
  year?: string;
}

export interface CreateFromScratchInput {
  fullName?: string;
  targetRole?: string;
  experience: ResumeExperienceInput[];
  education: ResumeEducationInput[];
  skills: string[];
  achievements: string[];
}

export interface ResumeAiContact {
  emails: string[];
  phones: string[];
  linkedin: string[];
  github: string[];
  website: string[];
}

export interface ResumeAiContent {
  contact_info?: ResumeAiContact;
  sections?: { summary?: string; experience?: string; education?: string };
  skills?: string[];
  improvement_notes?: { section: string; before: string; after: string }[];
  ats_keyword_suggestions?: string[];
}

export interface ResumeWritingDraft {
  id: string;
  source_type: 'upload' | 'scratch';
  title: string | null;
  template_id: string | null;
  pdf_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  ai_content?: ResumeAiContent;
  created_at: string;
  completed_at: string | null;
}

export function improveResume(file: UploadFile) {
  return apiUploadNative<{ ok: boolean; data: { draft_id: string; status: string } }>(
    '/candidate/resume-writing/improve',
    file,
    'resume',
  );
}

export function createResumeFromScratch(input: CreateFromScratchInput) {
  return apiPostJson<{ ok: boolean; data: { draft_id: string; status: string } }>('/candidate/resume-writing/create', {
    full_name: input.fullName,
    target_role: input.targetRole,
    experience: input.experience,
    education: input.education,
    skills: input.skills,
    achievements: input.achievements,
  });
}

export function listResumeDrafts() {
  return apiGet<{ ok: boolean; data: ResumeWritingDraft[] }>('/candidate/resume-writing');
}

export function getResumeDraft(draftId: string) {
  return apiGet<{ ok: boolean; data: ResumeWritingDraft }>(`/candidate/resume-writing/${draftId}`);
}

export function renderResumeDraft(draftId: string, templateId: string) {
  return apiPostJson<{ ok: boolean; data: { pdf_url: string; template_id: string } }>(
    `/candidate/resume-writing/${draftId}/render`,
    { template_id: templateId },
  );
}
