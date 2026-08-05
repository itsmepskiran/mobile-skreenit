import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiGet, apiPut } from '@/lib/api/client';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Ported from sql-skreenit's dashboard/reports.html + dashboard/js/reports.js
// (routers/recruiter_reports.py). Gated behind "any Premium Service" — callers
// should check getReportsAccess() before rendering report content.
export interface ReportsSummary {
  time_to_hire_avg_days: number | null;
  hired_count: number;
  interview_no_show_rate: number | null;
  interview_no_show_count: number;
  interview_total_scheduled: number;
  funnel_counts: Record<string, number>;
}

export interface FunnelStage {
  stage: string;
  reached: number;
  conversion_pct: number | null;
}

export interface BottleneckStage {
  stage: string;
  applications_in_stage: number;
  avg_dwell_hours: number | null;
}

function qs(jobId?: string) {
  return jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
}

export function getReportsAccess() {
  return apiGet<{ ok: boolean; data: { accessible: boolean } }>('/recruiter/reports/access');
}

export function getMetricsSummary(jobId?: string) {
  return apiGet<{ ok: boolean; data: ReportsSummary }>(`/recruiter/reports/metrics/summary${qs(jobId)}`);
}

export function getMetricsFunnel(jobId?: string) {
  return apiGet<{ ok: boolean; data: { funnel: FunnelStage[] } }>(`/recruiter/reports/metrics/funnel${qs(jobId)}`);
}

export function getMetricsBottlenecks(jobId?: string) {
  return apiGet<{ ok: boolean; data: { bottlenecks: BottleneckStage[] } }>(
    `/recruiter/reports/metrics/bottlenecks${qs(jobId)}`,
  );
}

export interface JobInsights {
  common_missing_skills: { skill: string; count: number }[];
  avg_emotion_distribution: Record<string, number>;
  avg_speaking_pace: number | null;
  avg_filler_word_rate: number | null;
  avg_communication_score: number | null;
  sample_size: number;
  resume_match_sample_size: number;
}

export function getJobInsights(jobId: string) {
  return apiGet<{ ok: boolean; data: JobInsights }>(`/recruiter/reports/insights/${encodeURIComponent(jobId)}`);
}

export interface JobMetricsSnapshot {
  total_applications: number;
  hired_count: number;
  hired_rate: number | null;
  time_to_hire_avg_days: number | null;
}

export interface JobBenchmark {
  this_job: JobMetricsSnapshot;
  department_average: JobMetricsSnapshot | null;
  sample_size: number;
  department: string | null;
  message?: string;
}

export function getJobBenchmark(jobId: string) {
  return apiGet<{ ok: boolean; data: JobBenchmark }>(
    `/recruiter/reports/metrics/benchmark?job_id=${encodeURIComponent(jobId)}`,
  );
}

// PDF/CSV export doesn't exist anywhere else in this app yet — downloads the binary
// response to a local cache file (with the auth header, unlike the public-resume
// download pattern in lib/api/applicant.ts) then hands it to the OS share sheet.
export async function downloadReportExport(format: 'pdf' | 'csv', jobId?: string): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to download reports.');

  const url = `${API_V1}/recruiter/reports/export.${format}${qs(jobId)}`;
  const localUri = `${FileSystem.cacheDirectory}recruiter-report.${format}`;

  const downloaded = await FileSystem.downloadAsync(url, localUri, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  if (downloaded.status !== 200) {
    throw new Error(`Server error (${downloaded.status})`);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloaded.uri, {
      mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
      dialogTitle: 'Recruiter Report',
    });
  }
}

export interface ReportPreferences {
  digest_enabled: boolean;
  frequency: 'weekly' | 'monthly';
}

export function getReportPreferences() {
  return apiGet<{ ok: boolean; data: ReportPreferences }>('/recruiter/reports/preferences');
}

export function updateReportPreferences(prefs: ReportPreferences) {
  return apiPut<{ ok: boolean; data: ReportPreferences }>('/recruiter/reports/preferences', { body: prefs });
}

export interface StaleApplication {
  application_id: string;
  job_id: string;
  job_title: string;
  status: string;
  days_stale: number;
}

export interface LowConversionJob {
  job_id: string;
  job_title: string;
  total_applications: number;
  hired_count: number;
  hired_rate_pct: number;
}

export interface ReportAlerts {
  stale_applications: StaleApplication[];
  low_conversion_jobs: LowConversionJob[];
}

export function getReportAlerts() {
  return apiGet<{ ok: boolean; data: ReportAlerts }>('/recruiter/reports/alerts');
}

export interface AlertPreferences {
  alerts_enabled: boolean;
  stale_days_threshold: number;
  low_conversion_threshold_pct: number;
}

export function getAlertPreferences() {
  return apiGet<{ ok: boolean; data: AlertPreferences }>('/recruiter/reports/alert-preferences');
}

export function updateAlertPreferences(prefs: AlertPreferences) {
  return apiPut<{ ok: boolean; data: AlertPreferences }>('/recruiter/reports/alert-preferences', { body: prefs });
}
