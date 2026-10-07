import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuickActions } from '@/components/quick-actions';
import { RecruiterWalletCard } from '@/components/recruiter-wallet-card';
import { HighlightTile } from '@/components/highlight-tile';
import { StatusBadge } from '@/components/status-badge';
import { cardSurface } from '@/constants/theme';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';
import { getRecruiterStats, listRecentJobs, listRecruiterApplications } from '@/lib/api/recruiter';
import { getUnreadCount } from '@/lib/api/notifications';
import type { ApplicationStatus } from '@/lib/api/applicant';
import { withBackTo } from '@/lib/navigation/smart-back';

export default function RecruiterDashboardScreen() {
  const theme = useTheme();

  const statsQuery = useQuery({ queryKey: ['recruiter', 'stats'], queryFn: getRecruiterStats });
  const jobsQuery = useQuery({
    queryKey: ['recruiter', 'dashboard-jobs'],
    queryFn: () => listRecentJobs({ pageSize: 4 }),
  });
  const applicationsQuery = useQuery({
    queryKey: ['recruiter', 'dashboard-recent-applications'],
    queryFn: () => listRecruiterApplications(),
  });
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });

  const stats = statsQuery.data?.data;
  const jobs = jobsQuery.data?.data.jobs ?? [];
  const rawApplications = applicationsQuery.data?.data;
  const applications = [...(Array.isArray(rawApplications) ? rawApplications : [])]
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 4);
  const unreadCount = unreadQuery.data?.data.unread_count ?? 0;

  if (statsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Dashboard" subtitle="Your hiring at a glance" icon="house" right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable style={styles.bellButton} onPress={() => router.push('/(recruiter)/notifications')}>
              <FontAwesome6 name="bell" size={20} color="#fff" />
              {unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <ThemedText type="small" style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
            <Pressable style={[styles.postButton, { backgroundColor: 'rgba(255,255,255,0.22)' }]} onPress={() => router.push('/(recruiter)/jobs/create')}>
              <FontAwesome6 name="plus" size={13} color="#ffffff" />
              <ThemedText type="smallBold" style={styles.postButtonText}>
                Post Job
              </ThemedText>
            </Pressable>
          </View>} />
      <ScrollView contentContainerStyle={styles.content}>
        <RecruiterWalletCard />
        <QuickActions />

        <ThemedView style={styles.statsGrid}>
          <HighlightTile card icon="briefcase" label="Total Jobs" value={String(stats?.total_jobs ?? 0)} colors={['#667eea', '#764ba2']} />
          <HighlightTile card icon="circle-check" label="Active Jobs" value={String(stats?.active_jobs ?? 0)} colors={['#4facfe', '#00f2fe']} />
          <HighlightTile card icon="users" label="Applications" value={String(stats?.total_applications ?? 0)} colors={['#43e97b', '#38f9d7']} />
          <HighlightTile card icon="star" label="Shortlisted" value={String(stats?.shortlisted ?? 0)} colors={['#f093fb', '#f5576c']} />
          <HighlightTile card icon="video" label="Interviews" value={String(stats?.interviews ?? 0)} colors={['#fa709a', '#fee140']} />
          <HighlightTile
            card
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
                style={[styles.row, cardSurface(theme), { borderColor: theme.border }]}
                onPress={() => router.push(withBackTo(`/(recruiter)/jobs/${job.id}/edit`, '/(recruiter)/dashboard'))}
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
                style={[styles.row, cardSurface(theme), { borderColor: theme.border }]}
                onPress={() => router.push(withBackTo(`/(recruiter)/applications/${app.id}`, '/(recruiter)/dashboard'))}
              >
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {app.candidate_name || 'Candidate'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {app.job_title} · Applied {formatRelativeTime(app.applied_at)}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bellButton: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#ffffff', fontSize: 10, lineHeight: 12 },
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
