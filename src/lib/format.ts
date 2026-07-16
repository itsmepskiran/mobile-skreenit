export function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  const diffMs = Date.now() - then;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return new Date(isoString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// The backend forwards some `candidate_profiles` JSON columns (education,
// certifications, experience, spoken_languages) as a raw JSON-encoded string
// rather than a decoded array whenever the underlying column isn't a real
// MySQL JSON type — mobile's types assume an array, so guard against string/
// null/undefined at the point of use instead of assuming the API contract.
export function toArray<T>(value: T[] | string | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (!min && !max) return null;
  const symbol = currency === 'INR' ? '₹' : (currency ?? '');
  const format = (n: number) => `${symbol}${n.toLocaleString('en-IN')}`;
  if (min && max) return `${format(min)} - ${format(max)}`;
  return format((min ?? max) as number);
}
