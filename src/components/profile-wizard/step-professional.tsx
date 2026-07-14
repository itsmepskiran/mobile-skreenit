import { FontAwesome6 } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { NOTICE_PERIOD_OPTIONS, QUALIFICATION_OPTIONS, type StepProps } from '@/components/profile-wizard/types';

export function StepProfessional({ values, setValue }: StepProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Professional Details</ThemedText>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="Last drawn salary (₹ p.a.)"
            keyboardType="numeric"
            placeholder="e.g. 500000"
            value={values.current_salary}
            onChangeText={(v) => setValue('current_salary', v)}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Expected salary (₹ p.a.)"
            keyboardType="numeric"
            placeholder="e.g. 700000"
            value={values.expected_salary}
            onChangeText={(v) => setValue('expected_salary', v)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <SelectField
            label="Notice period"
            options={NOTICE_PERIOD_OPTIONS}
            value={values.notice_period_days}
            onChange={(v) => setValue('notice_period_days', v)}
            placeholder="Select notice period"
          />
        </View>
        <View style={styles.half}>
          <SelectField
            label="Highest qualification"
            options={QUALIFICATION_OPTIONS}
            value={values.highest_qualification}
            onChange={(v) => setValue('highest_qualification', v)}
            placeholder="Select qualification"
          />
        </View>
      </View>

      <ThemedView style={styles.sectionHeading}>
        <FontAwesome6 name="share-nodes" size={13} color={theme.primary} />
        <ThemedText type="smallBold">Social Connect</ThemedText>
      </ThemedView>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="LinkedIn URL"
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://linkedin.com/in/username"
            value={values.linkedin_url}
            onChangeText={(v) => setValue('linkedin_url', v)}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Portfolio / website"
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://yourwebsite.com"
            value={values.portfolio_url}
            onChangeText={(v) => setValue('portfolio_url', v)}
          />
        </View>
      </View>
      <TextField
        label="Personal projects"
        placeholder="Share links to your notable projects"
        multiline
        numberOfLines={2}
        value={values.personal_projects}
        onChangeText={(v) => setValue('personal_projects', v)}
      />
      <TextField
        label="Personal blogs / articles"
        placeholder="Share links to your blogs or articles"
        multiline
        numberOfLines={2}
        value={values.personal_blogs}
        onChangeText={(v) => setValue('personal_blogs', v)}
      />

      <TextField
        label="Professional summary"
        placeholder="Brief overview of your experience, skills, and career objectives..."
        multiline
        numberOfLines={4}
        style={styles.multiline}
        value={values.summary}
        onChangeText={(v) => setValue('summary', v)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
});
