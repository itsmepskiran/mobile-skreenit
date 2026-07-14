import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { applyToJob, checkApplicationStatus } from '@/lib/api/applicant';
import { ApiError } from '@/lib/api/client';
import { getJob } from '@/lib/api/jobs';
import { Button } from '@/components/button';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';

export default function JobDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const jobQuery = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id) });
  const statusQuery = useQuery({
    queryKey: ['applicationStatus', id],
    queryFn: () => checkApplicationStatus(id),
  });

  const job = jobQuery.data?.data;
  const applicationStatus = statusQuery.data?.data;

  const onApply = async () => {
    setApplyError(null);
    setApplying(true);
    try {
      await applyToJob(id, coverLetter.trim() || undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applicationStatus', id] }),
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
      ]);
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === 'string' && err.detail.includes('Already applied')) {
        // Backend state and our cached status disagree — resync rather than show a scary error.
        await queryClient.invalidateQueries({ queryKey: ['applicationStatus', id] });
      } else {
        setApplyError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  if (jobQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load this job.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const salary = formatSalaryRange(job.salary_min, job.salary_max, job.currency);
  const experienceRange =
    job.experience_min != null || job.experience_max != null
      ? `${job.experience_min ?? 0}-${job.experience_max ?? job.experience_min} yrs`
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: job.job_title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{job.job_title}</ThemedText>
          <ThemedText themeColor="textSecondary">{job.company_name}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.metaGrid}>
          <MetaRow icon="location-dot" label={job.is_remote ? 'Remote' : job.location} />
          <MetaRow icon="briefcase" label={job.job_type} />
          {salary ? <MetaRow icon="sack-dollar" label={salary} /> : null}
          {experienceRange ? <MetaRow icon="clock" label={`${experienceRange} experience`} /> : null}
          {job.department ? <MetaRow icon="building" label={job.department} /> : null}
          {job.employment_type ? <MetaRow icon="file-signature" label={job.employment_type} /> : null}
          {job.notice_period_days != null ? (
            <MetaRow icon="calendar" label={`${job.notice_period_days} days notice period`} />
          ) : null}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Description</ThemedText>
          <ThemedText>{job.description}</ThemedText>
        </ThemedView>

        {job.requirements ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Requirements</ThemedText>
            <ThemedText>{job.requirements}</ThemedText>
          </ThemedView>
        ) : null}

        {job.contact_person_name ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Contact</ThemedText>
            <ThemedText>{job.contact_person_name}</ThemedText>
            {job.contact_person_email ? (
              <ThemedText themeColor="textSecondary">{job.contact_person_email}</ThemedText>
            ) : null}
          </ThemedView>
        ) : null}

        <ThemedView style={styles.applySection}>
          {statusQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : applicationStatus?.applied ? (
            <ThemedView style={styles.appliedRow}>
              <StatusBadge status={applicationStatus.status} />
              <ThemedText type="small" themeColor="textSecondary">
                Applied {formatRelativeTime(applicationStatus.applied_at)}
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              <TextField
                label="Cover letter (optional)"
                placeholder="Tell the recruiter why you're a good fit"
                multiline
                numberOfLines={4}
                value={coverLetter}
                onChangeText={setCoverLetter}
                style={styles.coverLetterInput}
              />
              {applyError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {applyError}
                </ThemedText>
              ) : null}
              <Button title="Apply Now" icon="paper-plane" onPress={onApply} loading={applying} />
            </>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ icon, label }: { icon: React.ComponentProps<typeof FontAwesome6>['name']; label: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.metaRow}>
      <FontAwesome6 name={icon} size={13} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  content: { padding: 20, gap: 20 },
  header: { gap: 2 },
  metaGrid: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { gap: 6 },
  applySection: { gap: 12, marginTop: 8 },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coverLetterInput: { minHeight: 90, textAlignVertical: 'top' },
});
