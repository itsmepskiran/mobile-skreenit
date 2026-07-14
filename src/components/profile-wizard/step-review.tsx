import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WizardValues } from '@/components/profile-wizard/types';

export interface StepReviewProps {
  values: WizardValues;
  fullName: string;
  email: string;
}

// Read-only summary — the actual "Save profile" action lives in the wizard
// container's footer so every step shares the same nav/save button.
export function StepReview({ values, fullName, email }: StepReviewProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Review</ThemedText>
      <ThemedText themeColor="textSecondary">
        Please review your information below, then tap Save to update your profile.
      </ThemedText>

      <SummaryBlock title="Personal">
        <Row label="Name" value={fullName} />
        <Row label="Email" value={email} />
        <Row label="Phone" value={values.phone} />
        <Row
          label="Current address"
          value={[values.current_city, values.current_state, values.current_country].filter(Boolean).join(', ')}
        />
      </SummaryBlock>

      <SummaryBlock title="Professional">
        <Row label="Expected salary" value={values.expected_salary ? `₹${values.expected_salary} p.a.` : ''} />
        <Row label="Highest qualification" value={values.highest_qualification} />
        <Row label="Summary" value={values.summary} />
      </SummaryBlock>

      <SummaryBlock title="Education">
        <Row label="Graduation" value={values.graduation} />
        <Row label="Additional degrees" value={String(values.education.length)} />
        <Row label="Certifications" value={String(values.certifications.length)} />
      </SummaryBlock>

      <SummaryBlock title="Skills & Languages">
        <Row label="Skills" value={values.skills.join(', ') || 'None added'} />
        <Row label="Languages" value={values.spoken_languages.join(', ') || 'None selected'} />
      </SummaryBlock>

      <SummaryBlock title="Experience">
        <Row label="Current role" value={[values.current_designation, values.current_company].filter(Boolean).join(' at ')} />
        <Row label="Previous roles" value={String(values.experience.length)} />
      </SummaryBlock>
    </ThemedView>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.block, { borderColor: theme.border }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.rowValue} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  block: { borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  rowLabel: { width: 130 },
  rowValue: { flex: 1 },
});
