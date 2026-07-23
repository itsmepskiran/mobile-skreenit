import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { applyToJob, checkApplicationStatus } from '@/lib/api/applicant';
import { ApiError } from '@/lib/api/client';
import { getJob } from '@/lib/api/jobs';
import { HighlightTile } from '@/components/highlight-tile';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';

export default function JobDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const jobQuery = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id) });
  const statusQuery = useQuery({
    queryKey: ['applicationStatus', id],
    queryFn: () => checkApplicationStatus(id),
  });

  const job = jobQuery.data?.data;
  const applicationStatus = statusQuery.data?.data;

  // Matches sql-skreenit's apply flow: no cover-letter field exists there — a single tap.
  const onApply = async () => {
    setApplyError(null);
    setApplying(true);
    try {
      await applyToJob(id);
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
          <ThemedText themeColor="primary">{job.company_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            JRF: {job.jrf_number || '—'} &middot; Ref: {job.reference_no || '—'}
          </ThemedText>
          <ThemedView style={styles.metaRow}>
            <FontAwesome6 name="location-dot" size={12} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {job.is_remote ? 'Remote' : job.location}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              &middot; Posted {formatRelativeTime(job.created_at)}
            </ThemedText>
          </ThemedView>
          {salary ? (
            <ThemedText type="small" themeColor="textSecondary">
              {salary}
            </ThemedText>
          ) : null}
        </ThemedView>

        {/* Matches sql-skreenit's job-details.html "Job Highlights" 8-tile grid (7 here — the
            public detail endpoint doesn't surface no_of_openings). */}
        <ThemedView style={styles.highlightsGrid}>
          {job.department ? (
            <HighlightTile icon="building" label="Department" value={job.department} colors={['#667eea', '#764ba2']} />
          ) : null}
          {job.role ? (
            <HighlightTile icon="user-tag" label="Role" value={job.role} colors={['#f093fb', '#f5576c']} />
          ) : null}
          {job.employment_type ? (
            <HighlightTile
              icon="clock"
              label="Employment Type"
              value={job.employment_type}
              colors={['#4facfe', '#00f2fe']}
            />
          ) : null}
          {experienceRange ? (
            <HighlightTile icon="chart-line" label="Experience" value={experienceRange} colors={['#fa709a', '#fee140']} />
          ) : null}
          {job.notice_period_days != null ? (
            <HighlightTile
              icon="calendar-days"
              label="Notice Period"
              value={`${job.notice_period_days} days`}
              colors={['#a8edea', '#fed6e3']}
              iconColor="#333333"
            />
          ) : null}
          {job.industry ? (
            <HighlightTile icon="industry" label="Industry" value={job.industry} colors={['#667eea', '#764ba2']} />
          ) : null}
          {job.education_qualification ? (
            <HighlightTile
              icon="graduation-cap"
              label="Education"
              value={job.education_qualification}
              colors={['#f093fb', '#f5576c']}
            />
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
            <ThemedView style={[styles.applyButton, styles.appliedButton]}>
              <FontAwesome6 name="circle-check" size={16} color="#ffffff" />
              <ThemedText type="smallBold" style={styles.applyButtonText}>
                Already Applied
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {applyError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {applyError}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={onApply}
                disabled={applying}
                style={[styles.applyButton, { backgroundColor: theme.primary }, applying && styles.applyButtonDisabled]}
              >
                {applying ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <ThemedText type="smallBold" style={styles.applyButtonText}>
                      Apply Now
                    </ThemedText>
                    <FontAwesome6 name="paper-plane" size={15} color="#ffffff" />
                  </>
                )}
              </Pressable>
            </>
          )}
          {applicationStatus?.applied ? (
            <ThemedView style={styles.appliedMetaRow}>
              <StatusBadge status={applicationStatus.status} />
              <ThemedText type="small" themeColor="textSecondary">
                Applied {formatRelativeTime(applicationStatus.applied_at)}
              </ThemedText>
            </ThemedView>
          ) : null}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  content: { padding: 20, gap: 20 },
  header: { gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  section: { gap: 6 },
  applySection: { gap: 12, marginTop: 8 },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 30,
    paddingVertical: 16,
  },
  appliedButton: {
    backgroundColor: '#22c55e',
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#ffffff',
  },
  appliedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
