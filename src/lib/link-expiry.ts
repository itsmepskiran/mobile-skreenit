// Assessment invite links stop working at the end of a chosen day. Same default as the
// website (assets/assets/js/assessment-invite-modal.js): 7 days, at most a year.
export const DEFAULT_LINK_VALID_DAYS = 7;
export const LINK_VALID_DAY_CHOICES = [3, 7, 14, 30];

// The last day a link works, as YYYY-MM-DD (the backend's expires_on).
export function linkExpiryDate(days: number = DEFAULT_LINK_VALID_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatExpiry(value?: string | null) {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
