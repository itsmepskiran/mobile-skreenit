import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';
import type { ApplicationStatus } from '@/lib/api/applicant';

// "pending" is a known backend quirk (submit_application() sets it, but it isn't
// part of the DB enum) — falls through to the neutral "default" styling below,
// same as any other unrecognized status.
const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  submitted: { label: 'Submitted', bg: '#EEF2FF', fg: Colors.light.primary },
  responses_submitted: { label: 'Responses submitted', bg: '#EEF2FF', fg: Colors.light.primary },
  reviewed: { label: 'Reviewed', bg: '#FEF3C7', fg: '#B45309' },
  shortlisted: { label: 'Shortlisted', bg: '#D1FAE5', fg: '#047857' },
  interview_scheduled: { label: 'Interview scheduled', bg: '#D1FAE5', fg: '#047857' },
  interviewing: { label: 'Interviewing', bg: '#D1FAE5', fg: '#047857' },
  hired: { label: 'Hired', bg: '#D1FAE5', fg: '#047857' },
  rejected: { label: 'Not selected', bg: '#FEE2E2', fg: '#B91C1C' },
};

const DEFAULT_STYLE = { label: 'In review', bg: '#F1F5F9', fg: Colors.light.textSecondary };

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
