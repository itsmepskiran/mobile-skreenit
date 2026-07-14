import { FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';
import type { JobListItem } from '@/lib/api/jobs';

export interface JobCardProps {
  job: JobListItem;
  onPress: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const theme = useTheme();
  const salary = formatSalaryRange(job.salary_min, job.salary_max, job.currency);
  const skills = job.skills?.slice(0, 3) ?? [];
  const extraSkillCount = (job.skills?.length ?? 0) - skills.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" numberOfLines={2}>
        {job.job_title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{job.company_name}</ThemedText>

      <ThemedView style={styles.metaRow}>
        <FontAwesome6 name="location-dot" size={12} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {job.is_remote ? 'Remote' : job.location}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.metaRow}>
        <FontAwesome6 name="briefcase" size={12} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {job.job_type}
        </ThemedText>
        {salary ? (
          <ThemedText type="small" themeColor="textSecondary">
            {' '}
            &middot; {salary}
          </ThemedText>
        ) : null}
      </ThemedView>

      {skills.length > 0 ? (
        <View style={styles.skillsRow}>
          {skills.map((skill) => (
            <View key={skill} style={[styles.skillChip, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="primary">
                {skill}
              </ThemedText>
            </View>
          ))}
          {extraSkillCount > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              +{extraSkillCount} more
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.postedAt}>
        Posted {formatRelativeTime(job.created_at)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 16,
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  skillChip: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  postedAt: {
    marginTop: 4,
  },
});
