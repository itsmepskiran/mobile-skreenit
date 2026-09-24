import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiGet, apiPostJson } from '@/lib/api/client';
import type { ResumeInsights } from '@/lib/api/resume-analysis';
import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Candidate self-analysis panel (Profile Settings' Resume Analysis) — a prerequisite for the
// Employability Report below, which 409s without a cached candidate_resume_analysis row.
// Takes no body: the backend re-parses whatever's already at candidate_profiles.resume_url.
export function analyzeOwnResume() {
  return apiPostJson<{ ok: boolean; data: ResumeInsights }>('/applicant/profile/analyze-resume', {});
}

export function getOwnResumeAnalysis() {
  return apiGet<{ ok: boolean; data: ResumeInsights | null; message?: string }>('/applicant/profile/resume-analysis');
}

export class EmployabilityReportError extends Error {
  kind: 'needs_credit' | 'needs_resume' | 'other';
  constructor(kind: 'needs_credit' | 'needs_resume' | 'other', message: string) {
    super(message);
    this.kind = kind;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Pure-JS base64 encoder — same approach as lib/api/resume-writing.ts's
// arrayBufferToBase64 (RN's Blob-from-ArrayBuffer path is unreliable for large PDFs).
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 0x03) << 4) | ((b2 ?? 0) >> 4)];
    result += b2 !== undefined ? BASE64_CHARS[((b2 & 0x0f) << 2) | ((b3 ?? 0) >> 6)] : '=';
    result += b3 !== undefined ? BASE64_CHARS[b3 & 0x3f] : '=';
  }
  return result;
}

// GET /applicant/profile/employability-report charges a credit (or draws on an active Career
// Pass) and streams a fresh PDF in the same call — mirrors sql-skreenit's
// applicant/js/employability-report.js generateReport() three-way status branch exactly:
// 402 = needs a credit, 404/409 = resume not uploaded/analyzed yet, else success.
export async function generateEmployabilityReport(): Promise<void> {
  const tokens = getSessionController().getTokens();
  if (!tokens?.accessToken) throw new Error('Please log in to generate your report.');

  const res = await fetch(`${API_V1}/applicant/profile/employability-report`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  if (res.status === 402) {
    throw new EmployabilityReportError(
      'needs_credit',
      'The Personal Employability Report costs a credit per generation. Purchase a credit or subscribe to Career Pass to continue.',
    );
  }
  if (res.status === 404 || res.status === 409) {
    let message = 'Upload and analyze your resume first before generating a report.';
    try {
      const errJson = await res.json();
      message = errJson?.detail || errJson?.message || message;
    } catch {
      // Body wasn't JSON — keep the default message.
    }
    throw new EmployabilityReportError('needs_resume', message);
  }
  if (!res.ok) {
    throw new EmployabilityReportError('other', 'Report generation failed. Please try again.');
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const localUri = `${FileSystem.cacheDirectory}employability_report.pdf`;
  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', dialogTitle: 'Employability Report' });
  }
}
