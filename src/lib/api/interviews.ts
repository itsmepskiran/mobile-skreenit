import { apiGet, apiPostJson, apiPut } from '@/lib/api/client';

// Distinct from (recruiter)/interviews.tsx's "Pending Interviews" tab, which is a
// client-side status filter over GET /recruiter/applications. This is the real
// `interviews` table (migration 038) — scheduled appointments with date/time,
// interviewer, meeting link, etc. Ported from sql-skreenit's
// dashboard/js/interviews-calendar.js + assets/assets/js/schedule-interview-modal.js.
export interface Interview {
  id: string;
  job_id: string;
  application_id: string | null;
  candidate_id: string | null;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
  scheduled_at: string;
  duration_minutes: number;
  interviewer_name: string | null;
  interviewer_email: string | null;
  meeting_link: string | null;
  location: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  notes: string | null;
  questions: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewInput {
  jobId: string;
  applicationId?: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  scheduledAt: string; // ISO datetime
  durationMinutes?: number;
  interviewerName?: string;
  interviewerEmail?: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  questions?: string[];
}

function toCreateBody(input: InterviewInput) {
  return {
    job_id: input.jobId,
    application_id: input.applicationId,
    candidate_id: input.candidateId,
    candidate_name: input.candidateName,
    candidate_email: input.candidateEmail,
    candidate_phone: input.candidatePhone,
    scheduled_at: input.scheduledAt,
    duration_minutes: input.durationMinutes ?? 30,
    interviewer_name: input.interviewerName,
    interviewer_email: input.interviewerEmail,
    meeting_link: input.meetingLink,
    location: input.location,
    notes: input.notes,
    questions: input.questions ?? [],
  };
}

export function listInterviews(params: { jobId?: string; status?: string } = {}) {
  const query = new URLSearchParams();
  if (params.jobId) query.set('job_id', params.jobId);
  if (params.status) query.set('status', params.status);
  query.set('page_size', '200');
  return apiGet<{ ok: boolean; data: { interviews: Interview[]; total: number } }>(
    `/recruiter/interviews?${query.toString()}`,
  );
}

export function createInterview(input: InterviewInput) {
  return apiPostJson<{ ok: boolean; data: { id: string } }>('/recruiter/interviews', toCreateBody(input));
}

// Partial update — passing `scheduledAt` flips status to 'rescheduled' server-side.
export function updateInterview(
  id: string,
  input: Partial<Omit<InterviewInput, 'jobId' | 'applicationId' | 'candidateId' | 'candidateName'>>,
) {
  return apiPut<{ ok: boolean; data: unknown }>(`/recruiter/interviews/${id}`, {
    body: {
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes,
      interviewer_name: input.interviewerName,
      interviewer_email: input.interviewerEmail,
      meeting_link: input.meetingLink,
      location: input.location,
      notes: input.notes,
      questions: input.questions,
    },
  });
}

export function cancelInterview(id: string) {
  return apiPut<{ ok: boolean; message: string }>(`/recruiter/interviews/${id}/cancel`);
}
