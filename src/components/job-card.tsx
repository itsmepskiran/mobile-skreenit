import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// Matches sql-skreenit's jobs.html job-card exactly: header row with a job-type
// pill badge, separate icon rows for location/salary/experience, truncated
// description, skill chips, "Posted {date}" footer, green-gradient Apply button.
export function JobCard({ job, onPress }: JobCardProps) {
  const theme = useTheme();
  const salary = formatSalaryRange(job.salary_min, job.salary_max, job.currency);
  const skills = job.skills?.slice(0, 4) ?? [];
  const extraSkillCount = (job.skills?.length ?? 0) - skills.length;
  const description = job.description.length > 120 ? `${job.description.slice(0, 120)}…` : job.description;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <ThemedView style={styles.headerRow}>
        <ThemedView style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {job.job_title}
          </ThemedText>
          <ThemedText themeColor="primary">{job.company_name}</ThemedText>
        </ThemedView>
        <LinearGradient colors={['#4f46e5', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.typeBadge}>
          <ThemedText type="small" style={styles.typeBadgeText}>
            {job.is_remote ? 'Remote' : job.job_type}
          </ThemedText>
        </LinearGradient>
      </ThemedView>

      {!job.is_remote && job.location ? (
        <ThemedView style={styles.metaRow}>
          <FontAwesome6 name="location-dot" size={12} color={theme.primary} />
          <ThemedText type="small" themeColor="textSecondary">
            {job.location}
          </ThemedText>
        </ThemedView>
      ) : null}

      {salary ? (
        <ThemedView style={styles.metaRow}>
          <FontAwesome6 name="sack-dollar" size={12} color={theme.primary} />
          <ThemedText type="small" themeColor="textSecondary">
            {salary}
          </ThemedText>
        </ThemedView>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {description}
      </ThemedText>

      {skills.length > 0 ? (
        <View style={styles.skillsRow}>
          {skills.map((skill) => (
            <View key={skill} style={styles.skillChip}>
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

      <ThemedView style={styles.footerRow}>
        <FontAwesome6 name="clock" size={11} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          Posted {formatRelativeTime(job.created_at)}
        </ThemedText>
      </ThemedView>

      <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyButton}>
        <FontAwesome6 name="paper-plane" size={13} color="#ffffff" />
        <ThemedText type="smallBold" style={styles.applyButtonText}>
          Apply Now
        </ThemedText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  typeBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
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
    marginTop: 2,
  },
  skillChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(79,70,229,0.1)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: 4,
  },
  applyButtonText: {
    color: '#ffffff',
  },
});
