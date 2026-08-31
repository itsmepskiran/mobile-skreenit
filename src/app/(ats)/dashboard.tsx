import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AtsStatusBadge } from '@/components/ats-status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listAtsDepartments, listAtsJobs, listAtsPositions, listAtsRequisitions, listAtsUsers } from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

// Matches sql-skreenit's ats/dashboard.html — KPI tiles + pending
// requisitions / open jobs, all computed client-side from parallel GETs
// (there is no dedicated /ats/dashboard endpoint on web either).
export default function AtsDashboardScreen() {
  const theme = useTheme();
  const user = useAtsStore((state) => state.user);

  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments });
  const positionsQuery = useQuery({ queryKey: ['ats', 'positions'], queryFn: listAtsPositions });
  const jobsQuery = useQuery({ queryKey: ['ats', 'jobs', 'all'], queryFn: () => listAtsJobs() });
  const requisitionsQuery = useQuery({ queryKey: ['ats', 'requisitions', 'all'], queryFn: () => listAtsRequisitions() });
  const usersQuery = useQuery({ queryKey: ['ats', 'users'], queryFn: listAtsUsers });

  const isLoading =
    departmentsQuery.isLoading || positionsQuery.isLoading || jobsQuery.isLoading || requisitionsQuery.isLoading || usersQuery.isLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  const departments = departmentsQuery.data?.data ?? [];
  const positions = positionsQuery.data?.data ?? [];
  const jobs = jobsQuery.data?.data ?? [];
  const requisitions = requisitionsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  const openJobs = jobs.filter((j) => j.status === 'open');
  const pendingReqs = requisitions.filter((r) => r.status === 'pending');
  const headcount = positions.reduce((sum, p) => sum + (p.openings || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Welcome back, {user?.name ?? '—'}</ThemedText>
        <ThemedText themeColor="textSecondary">Here&apos;s what&apos;s happening at your company today.</ThemedText>

        <View style={styles.kpiGrid}>
          <KpiTile label="Departments" value={String(departments.length)} theme={theme} />
          <KpiTile label="Positions (Headcount)" value={String(headcount)} delta={`${positions.length} position types`} theme={theme} />
          <KpiTile label="Open Jobs" value={String(openJobs.length)} delta={`of ${jobs.length} total`} theme={theme} />
          <KpiTile label="Team Members" value={String(users.length)} theme={theme} />
        </View>

        <SectionCard title="Pending requisitions" theme={theme} onSeeAll={() => router.push('/(ats)/requisitions')}>
          {pendingReqs.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">
              No pending requisitions.
            </ThemedText>
          ) : (
            pendingReqs.slice(0, 5).map((r) => (
              <View key={r.id} style={[styles.row, { borderColor: theme.border }]}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">{r.designation_title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.department_name} · {r.requested_by_name}
                  </ThemedText>
                </View>
                <AtsStatusBadge status={r.status} />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Open jobs" theme={theme} onSeeAll={() => router.push('/(ats)/jobs')}>
          {openJobs.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">
              No open jobs yet.
            </ThemedText>
          ) : (
            openJobs.slice(0, 5).map((j) => (
              <View key={j.id} style={[styles.row, { borderColor: theme.border }]}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">{j.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {j.department_name}
                  </ThemedText>
                </View>
                <AtsStatusBadge status={j.status} />
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiTile({ label, value, delta, theme }: { label: string; value: string; delta?: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <ThemedView style={[styles.kpiTile, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="title" style={styles.kpiValue}>
        {value}
      </ThemedText>
      {delta ? (
        <ThemedText type="small" themeColor="textSecondary">
          {delta}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

function SectionCard({
  title,
  theme,
  onSeeAll,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useTheme>;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <ThemedView style={[styles.section, { borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAll}>
          <ThemedText type="small" themeColor="primary">
            See all
          </ThemedText>
          <FontAwesome6 name="chevron-right" size={10} color={theme.primary} />
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiTile: { width: '47%', borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 4 },
  kpiValue: { fontSize: 26, lineHeight: 32 },
  section: { borderWidth: 1, borderRadius: Radius.md, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
});
