import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCoinConsent } from '@/components/coin-consent-modal';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { featureJob, listMyJobs, type RecruiterJobListItem } from '@/lib/api/recruiter';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Featured Job boosts at a glance: which jobs are pinned on the jobs board right now (and until
// when), which boosts have ended, and how many applicants each job has — so a recruiter can judge
// whether boosting is paying off, then extend or boost another job.
export default function FeaturedJobsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { confirmSpend, consentModal } = useCoinConsent();
  const [now] = useState(() => Date.now());
  const jobsQuery = useQuery({ queryKey: ['recruiter', 'jobs', 'featured-screen'], queryFn: () => listMyJobs({ pageSize: 100 }) });
  const jobs = useMemo(() => jobsQuery.data?.data.jobs ?? [], [jobsQuery.data]);

  const isLive = (j: RecruiterJobListItem) => !!j.featured_until && new Date(j.featured_until).getTime() > now;
  const live = jobs.filter(isLive);
  const ended = jobs.filter((j) => j.featured_until && !isLive(j));
  const candidates = jobs.filter((j) => j.status === 'active' && !j.featured_until);
  const liveApplicants = live.reduce((n, j) => n + (j.applications_count ?? 0), 0);

  const boost = useMutation({
    mutationFn: async (job: RecruiterJobListItem) => {
      if (!(await confirmSpend({ action: 'featured_job', jobId: job.id }))) return null;
      return featureJob(job.id);
    },
    onSuccess: (res) => {
      if (res) queryClient.invalidateQueries({ queryKey: ['recruiter', 'jobs'] });
    },
    onError: (err) => Alert.alert('Could not feature this job', err instanceof Error ? err.message : 'Please try again.'),
  });

  const Card = ({ job, action }: { job: RecruiterJobListItem; action: string }) => (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="smallBold" numberOfLines={2}>{job.job_title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {job.featured_until ? (isLive(job) ? `Featured until ${fmt(job.featured_until)}` : `Boost ended ${fmt(job.featured_until)}`) : 'Not featured'} ·{' '}
          {job.applications_count ?? 0} applicants
        </ThemedText>
      </View>
      <Pressable style={[styles.button, { borderColor: '#f59e0b' }]} onPress={() => boost.mutate(job)} disabled={boost.isPending}>
        <FontAwesome6 name="star" size={12} color="#d97706" />
        <ThemedText type="small" style={{ color: '#b45309', fontWeight: '700' }}>{action}</ThemedText>
      </Pressable>
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Featured Jobs" subtitle="Boost jobs to the top of search" icon="star" backTo="/(recruiter)/ats-services" colors={['#f59e0b', '#ec4899']} />
      {jobsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            A featured job is shown first on the jobs board with a Featured badge for 7 days. Extend any time.
          </ThemedText>
          <View style={styles.stats}>
            <Stat value={String(live.length)} label="Live now" />
            <Stat value={String(liveApplicants)} label="Applicants on them" />
            <Stat value={String(ended.length)} label="Ended" />
          </View>

          <ThemedText type="subtitle">Live now</ThemedText>
          {live.length ? live.map((j) => <Card key={j.id} job={j} action="Extend" />) : (
            <ThemedText type="small" themeColor="textSecondary">No job is featured right now.</ThemedText>
          )}

          {candidates.length ? (
            <>
              <ThemedText type="subtitle">Boost a job</ThemedText>
              {candidates.slice(0, 10).map((j) => <Card key={j.id} job={j} action="Feature" />)}
            </>
          ) : null}

          {ended.length ? (
            <>
              <ThemedText type="subtitle">Past boosts</ThemedText>
              {ended.map((j) => <Card key={j.id} job={j} action="Feature again" />)}
            </>
          ) : null}
        </ScrollView>
      )}
      {consentModal}
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <ThemedText type="title" style={{ color: '#b45309' }}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 12 },
  stats: { flexDirection: 'row', backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: Radius.lg, paddingVertical: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
});
