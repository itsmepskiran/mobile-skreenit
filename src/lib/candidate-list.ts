// Read a recruiter's uploaded candidate list (CSV) into invitee rows for the assessment
// invite tabs. Same rules as the website's assets/assets/js/candidate-list-import.js:
// columns are found by header ("name", "mail", "phone"/"mobile"/"contact"/"whatsapp"); a
// file with no header is read cell by cell. The backend gives each candidate their own
// link and skips repeats; this only turns the file into a list.

export const MAX_IMPORT_ROWS = 500;

export interface ImportedCandidate {
  fullName: string;
  email: string;
  phone: string;
}

type Kind = 'fullName' | 'email' | 'phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function headerKind(cell: string): Kind | null {
  const c = cell.toLowerCase();
  if (c.includes('mail')) return 'email';
  if (c.includes('name')) return 'fullName';
  if (/phone|mobile|contact|whatsapp|number/.test(c)) return 'phone';
  return null;
}

function guessKind(value: string): Kind | null {
  const v = value.trim();
  if (!v) return null;
  if (v.includes('@')) return 'email';
  if (/^[\d\s+\-().]+$/.test(v) && v.replace(/\D/g, '').length >= 6) return 'phone';
  return 'fullName';
}

function cleanPhone(value: string) {
  const cleaned = value.trim().replace(/\.0+$/, '').replace(/[^\d+]/g, '');
  return cleaned.replace(/\D/g, '').length >= 6 ? cleaned : '';
}

export function csvToCandidates(text: string): { candidates: ImportedCandidate[]; problems: string[] } {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  if (!rows.length) return { candidates: [], problems: [] };

  const kinds = rows[0].map(headerKind);
  const hasHeader = kinds.includes('email') || kinds.includes('phone');
  const body = hasHeader ? rows.slice(1) : rows;
  const firstLine = hasHeader ? 2 : 1;

  const candidates: ImportedCandidate[] = [];
  const problems: string[] = [];
  body.forEach((cells, idx) => {
    const line = idx + firstLine;
    const c: ImportedCandidate = { fullName: '', email: '', phone: '' };
    cells.forEach((cell, col) => {
      const kind = hasHeader ? kinds[col] : guessKind(cell);
      const v = cell.trim();
      if (kind && v && !c[kind]) c[kind] = v;
    });
    c.phone = cleanPhone(c.phone);
    if (c.email && !EMAIL_RE.test(c.email)) {
      problems.push(`Row ${line}: "${c.email}" is not a valid email`);
      c.email = '';
    }
    if (!c.email && !c.phone) {
      if (!problems.some((p) => p.startsWith(`Row ${line}:`))) problems.push(`Row ${line}: no email or mobile number`);
      return;
    }
    candidates.push(c);
  });

  if (candidates.length > MAX_IMPORT_ROWS) {
    problems.push(`Only the first ${MAX_IMPORT_ROWS} candidates were loaded; upload the rest as a second file.`);
    candidates.length = MAX_IMPORT_ROWS;
  }
  return { candidates, problems };
}

// Plain-words summary of what the backend skipped after sending.
export function describeSkipped(skipped: { reason: string }[] = []) {
  const counts: Record<string, number> = {};
  skipped.forEach((s) => {
    counts[s.reason] = (counts[s.reason] ?? 0) + 1;
  });
  const parts: string[] = [];
  if (counts.duplicate_in_list) parts.push(`${counts.duplicate_in_list} listed twice`);
  if (counts.already_invited) parts.push(`${counts.already_invited} already invited`);
  if (counts.already_completed) parts.push(`${counts.already_completed} already took it`);
  return parts.join(', ');
}
