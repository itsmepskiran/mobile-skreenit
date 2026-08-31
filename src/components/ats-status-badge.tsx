import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';

// Matches sql-skreenit's ats-app.js STATUS_BADGE_MAP color families exactly —
// unlike components/status-badge.tsx (hardcoded to application statuses),
// this covers every status string used across the ATS module (department/
// designation/position/job/requisition/employee/user statuses all reuse the
// same five color families on web).
const FAMILY: Record<string, { bg: string; fg: string }> = {
  success: { bg: '#dcfce7', fg: '#166534' },
  neutral: { bg: '#f1f5f9', fg: '#475569' },
  info: { bg: '#e0e7ff', fg: '#3730a3' },
  warning: { bg: '#fef3c7', fg: '#92400e' },
  danger: { bg: '#fee2e2', fg: '#991b1b' },
};

const STATUS_FAMILY: Record<string, keyof typeof FAMILY> = {
  active: 'success',
  open: 'success',
  approved: 'success',
  published: 'success',
  inactive: 'neutral',
  closed: 'neutral',
  withdrawn: 'neutral',
  archived: 'neutral',
  draft: 'info',
  pending: 'warning',
  on_hold: 'warning',
  'on-leave': 'warning',
  rejected: 'danger',
  suspended: 'danger',
};

function statusLabel(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AtsStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const family = FAMILY[STATUS_FAMILY[key] ?? 'neutral'];

  return (
    <View style={[styles.badge, { backgroundColor: family.bg }]}>
      <ThemedText type="small" style={{ color: family.fg, fontWeight: '600' }}>
        {statusLabel(status) || '—'}
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
