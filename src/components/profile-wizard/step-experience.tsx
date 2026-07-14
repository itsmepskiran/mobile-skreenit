import { FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StepProps } from '@/components/profile-wizard/types';
import type { ExperienceEntry } from '@/lib/api/applicant';

export function StepExperience({ values, setValue }: StepProps) {
  const theme = useTheme();

  const updateExperience = (index: number, patch: Partial<ExperienceEntry>) => {
    const next = values.experience.slice();
    next[index] = { ...next[index], ...patch };
    setValue('experience', next);
  };
  const addExperience = () =>
    setValue('experience', [...values.experience, { job_title: '', company: '', start_date: '', end_date: '', description: '' }]);
  const removeExperience = (index: number) => setValue('experience', values.experience.filter((_, i) => i !== index));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Work Experience</ThemedText>

      <ThemedView style={styles.sectionHeading}>
        <FontAwesome6 name="briefcase" size={13} color={theme.primary} />
        <ThemedText type="smallBold">Current / Latest Experience</ThemedText>
      </ThemedView>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Company name" value={values.current_company} onChangeText={(v) => setValue('current_company', v)} />
        </View>
        <View style={styles.half}>
          <TextField label="Designation" value={values.current_designation} onChangeText={(v) => setValue('current_designation', v)} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="Date of joining"
            placeholder="YYYY-MM-DD"
            value={values.current_doj}
            onChangeText={(v) => setValue('current_doj', v)}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Date of leaving"
            placeholder="Leave blank if current"
            value={values.current_dol}
            onChangeText={(v) => setValue('current_dol', v)}
          />
        </View>
      </View>

      <ThemedView style={styles.listHeader}>
        <ThemedText type="smallBold">Previous Experience</ThemedText>
        <Pressable style={styles.addButton} onPress={addExperience}>
          <FontAwesome6 name="plus" size={11} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            Add Previous
          </ThemedText>
        </Pressable>
      </ThemedView>

      {values.experience.map((item, index) => (
        <ThemedView key={index} style={[styles.card, { borderColor: theme.border }]}>
          <ThemedView style={styles.cardHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Experience {index + 1}
            </ThemedText>
            <Pressable onPress={() => removeExperience(index)} hitSlop={8}>
              <FontAwesome6 name="trash" size={14} color={theme.danger} />
            </Pressable>
          </ThemedView>
          <View style={styles.row}>
            <View style={styles.half}>
              <TextField label="Title" value={item.job_title} onChangeText={(v) => updateExperience(index, { job_title: v })} />
            </View>
            <View style={styles.half}>
              <TextField label="Company" value={item.company} onChangeText={(v) => updateExperience(index, { company: v })} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <TextField
                label="Start"
                placeholder="YYYY-MM-DD"
                value={item.start_date}
                onChangeText={(v) => updateExperience(index, { start_date: v })}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label="End"
                placeholder="YYYY-MM-DD"
                value={item.end_date}
                onChangeText={(v) => updateExperience(index, { end_date: v })}
              />
            </View>
          </View>
          <TextField
            label="Description"
            multiline
            numberOfLines={3}
            style={styles.multiline}
            value={item.description}
            onChangeText={(v) => updateExperience(index, { description: v })}
          />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
});
