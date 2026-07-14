import { apiGet } from '@/lib/api/client';

export interface ReferenceItem {
  id: string;
  name: string;
}

function names(items: ReferenceItem[] = []) {
  return items.map((item) => ({ label: item.name, value: item.id }));
}

export async function getDepartments() {
  const res = await apiGet<{ ok: boolean; data: ReferenceItem[] }>('/reference/departments', { auth: false });
  return names(res.data);
}

// Roles are not actually linked to departments in current seed data
// (department_id is null for every row) — fetch unfiltered, no cascade.
export async function getRoles() {
  const res = await apiGet<{ ok: boolean; data: ReferenceItem[] }>('/reference/roles', { auth: false });
  return names(res.data);
}

export async function getEmploymentTypes() {
  const res = await apiGet<{ ok: boolean; data: ReferenceItem[] }>('/reference/employment-types', { auth: false });
  return names(res.data);
}

export async function getIndustries() {
  const res = await apiGet<{ ok: boolean; data: ReferenceItem[] }>('/reference/industries', { auth: false });
  return names(res.data);
}

export async function getJobTypes() {
  const res = await apiGet<{ ok: boolean; data: ReferenceItem[] }>('/reference/job-types', { auth: false });
  return names(res.data);
}

export async function getEducationLevels() {
  const res = await apiGet<{ ok: boolean; data: ReferenceItem[] }>('/reference/education-levels', { auth: false });
  return names(res.data);
}

export const NOTICE_PERIOD_OPTIONS = [
  { label: 'Immediate Joiner', value: '0' },
  { label: '15 Days', value: '15' },
  { label: '30 Days', value: '30' },
  { label: '60 Days', value: '60' },
  { label: '90 Days', value: '90' },
  { label: '120+ Days', value: '120' },
];
