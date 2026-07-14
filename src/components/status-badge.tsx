import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import type { ApplicationStatus } from '@/lib/api/applicant';

// Matches sql-skreenit's my-applications.js status-badge derivation exactly (label + colors).
// "pending"/"" are known backend quirks (submit_application() sets a status not in the DB
// enum) — same as the real web app, these fall through to the default "Applied" styling.
const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  submitted: { label: 'Applied', bg: '#ebf8ff', fg: '#2b6cb0' },
  reviewed: { label: 'Reviewed', bg: '#ebf8ff', fg: '#2b6cb0' },
  shortlisted: { label: 'Shortlisted', bg: '#ebf8ff', fg: '#2b6cb0' },
  responses_submitted: { label: 'Interview Submitted', bg: '#e6fffa', fg: '#2c7a7b' },
  interview_scheduled: { label: 'Pending Interview', bg: '#fffaf0', fg: '#c05621' },
  interviewing: { label: 'Pending Interview', bg: '#fffaf0', fg: '#c05621' },
  hired: { label: 'Offer Received', bg: '#f0fff4', fg: '#2f855a' },
  rejected: { label: 'Not Selected', bg: '#fff5f5', fg: '#c53030' },
};

const DEFAULT_STYLE = { label: 'Applied', bg: '#ebf8ff', fg: '#2b6cb0' };

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const style = STATUS_STYLE[status] ?? DEFAULT_STYLE;

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <ThemedText type="small" style={{ color: style.fg, fontWeight: '600' }}>
        {style.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
