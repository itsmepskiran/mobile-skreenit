import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighlightTile } from '@/components/highlight-tile';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';
import { getRecruiterStats, listRecentApplications, listRecentJobs } from '@/lib/api/recruiter';
import type { ApplicationStatus } from '@/lib/api/applicant';

export default function RecruiterDashboardScreen() {
  const theme = useTheme();

  const statsQuery = useQuery({ queryKey: ['recruiter', 'stats'], queryFn: getRecruiterStats });
  const jobsQuery = useQuery({
    queryKey: ['recruiter', 'dashboard-jobs'],
    queryFn: () => listRecentJobs({ pageSize: 4 }),
  });
  const applicationsQuery = useQuery({
    queryKey: ['recruiter', 'dashboard-applications'],
    queryFn: () => listRecentApplications({ pageSize: 4 }),
  });

  const stats = statsQuery.data?.data;
  const jobs = jobsQuery.data?.data.jobs ?? [];
  const applications = applicationsQuery.data?.data.applications ?? [];

  if (statsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title">Dashboard</ThemedText>
          <Pressable style={[styles.postButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(recruiter)/jobs/create')}>
            <FontAwesome6 name="plus" size={13} color="#ffffff" />
            <ThemedText type="smallBold" style={styles.postButtonText}>
              Post Job
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.statsGrid}>
          <HighlightTile icon="briefcase" label="Total Jobs" value={String(stats?.total_jobs ?? 0)} colors={['#667eea', '#764ba2']} />
          <HighlightTile icon="circle-check" label="Active Jobs" value={String(stats?.active_jobs ?? 0)} colors={['#4facfe', '#00f2fe']} />
          <HighlightTile icon="users" label="Applications" value={String(stats?.total_applications ?? 0)} colors={['#43e97b', '#38f9d7']} />
          <HighlightTile icon="star" label="Shortlisted" value={String(stats?.shortlisted ?? 0)} colors={['#f093fb', '#f5576c']} />
          <HighlightTile icon="video" label="Interviews" value={String(stats?.interviews ?? 0)} colors={['#fa709a', '#fee140']} />
          <HighlightTile
            icon="trophy"
            label="Hired"
            value={String(stats?.hired ?? 0)}
            colors={['#a8edea', '#fed6e3']}
            iconColor="#0f172a"
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <ThemedText type="smallBold">Recent Jobs</ThemedText>
            <Pressable onPress={() => router.push('/(recruiter)/jobs')}>
              <ThemedText type="link" themeColor="primary">
                View All
              </ThemedText>
            </Pressable>
          </ThemedView>
          {jobs.length === 0 ? (
            <ThemedText themeColor="textSecondary">No jobs posted yet.</ThemedText>
          ) : (
            jobs.map((job) => (
              <Pressable
                key={job.id}
                style={[styles.row, { borderColor: theme.border }]}
                onPress={() => router.push(`/(recruiter)/jobs/${job.id}/edit`)}
              >
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {job.job_title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {job.applications_count} applicants · Posted {formatRelativeTime(job.created_at)}
                  </ThemedText>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color={theme.textSecondary} />
              </Pressable>
            ))
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <ThemedText type="smallBold">Recent Applications</ThemedText>
            <Pressable onPress={() => router.push('/(recruiter)/applications')}>
              <ThemedText type="link" themeColor="primary">
                View All
              </ThemedText>
            </Pressable>
          </ThemedView>
          {applications.length === 0 ? (
            <ThemedText themeColor="textSecondary">No applications yet.</ThemedText>
          ) : (
            applications.map((app) => (
              <Pressable
                key={app.id}
                style={[styles.row, { borderColor: theme.border }]}
                onPress={() => router.push(`/(recruiter)/applications/${app.id}`)}
              >
                <View style={styles.rowText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Applied {formatRelativeTime(app.applied_at)}
                  </ThemedText>
                </View>
                <StatusBadge status={app.status as ApplicationStatus} />
              </Pressable>
            ))
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  postButtonText: { color: '#ffffff' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    rowGap: 20,
  },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
});
