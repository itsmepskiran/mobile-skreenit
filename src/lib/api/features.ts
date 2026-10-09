import { apiGet } from '@/lib/api/client';

// Public server-side feature switches (backend GET /features, backed by app_settings).
export interface Features {
  candidate_job_search: boolean;
}

export function getFeatures() {
  return apiGet<{ ok: boolean; data: Features }>('/features', { auth: false });
}

// Where a candidate lands after sign-in / switching role: Jobs normally, Dashboard while job search is
// switched off (the Jobs tab is hidden then). Falls back to Jobs if the switch can't be read.
export async function candidateHomeRoute(): Promise<'/(candidate)/jobs' | '/(candidate)/dashboard'> {
  try {
    const res = await getFeatures();
    return res.data.candidate_job_search === false ? '/(candidate)/dashboard' : '/(candidate)/jobs';
  } catch {
    return '/(candidate)/jobs';
  }
}
