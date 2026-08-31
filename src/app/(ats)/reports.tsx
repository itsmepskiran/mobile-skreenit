import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listAtsDepartments, listAtsEmployees, listAtsJobs, listAtsRequisitions } from '@/lib/api/ats';

// Matches sql-skreenit's ats/reports.html: every number here is computed
// client-side from the same list endpoints the other screens use — there is
// no dedicated /ats/reports endpoint on web either. Web's "chart" bars are
// purely decorative (CSS heights from Math.random(), unrelated to the real
// counts) so this renders the real breakdowns as data-proportional bars
// instead of reproducing that noise.
export default function AtsReportsScreen() {
  const theme = useTheme();

  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments });
  const jobsQuery = useQuery({ queryKey: ['ats', 'jobs', 'all'], queryFn: () => listAtsJobs() });
  const requisitionsQuery = useQuery({ queryKey: ['ats', 'requisitions', 'all'], queryFn: () => listAtsRequisitions() });
  const employeesQuery = useQuery({ queryKey: ['ats', 'employees'], queryFn: listAtsEmployees });

  const isLoading = departmentsQuery.isLoading || jobsQuery.isLoading || requisitionsQuery.isLoading || employeesQuery.isLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  const departments = departmentsQuery.data?.data ?? [];
  const jobs = jobsQuery.data?.data ?? [];
  const requisitions = requisitionsQuery.data?.data ?? [];
  const employees = employeesQuery.data?.data ?? [];

  const departmentalHiring = departments.map((d) => ({
    label: d.name,
    count: jobs.filter((j) => j.department_id === d.id && j.status === 'open').length,
  }));

  const jobStatuses: string[] = ['draft', 'open', 'on_hold', 'closed'];
  const jobPipeline = jobStatuses.map((s) => ({ label: s, count: jobs.filter((j) => j.status === s).length }));

  const reqStatuses: string[] = ['pending', 'approved', 'rejected', 'withdrawn'];
  const requisitionPipeline = reqStatuses.map((s) => ({ label: s, count: requisitions.filter((r) => r.status === s).length }));

  const empStatuses: string[] = ['active', 'on-leave', 'inactive'];
  const headcount = empStatuses.map((s) => ({ label: s, count: employees.filter((e) => e.status === s).length }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Reports</ThemedText>

        <ReportCard title="Departmental Hiring" rows={departmentalHiring} theme={theme} />
        <ReportCard title="Employee Headcount" rows={headcount} theme={theme} />
        <ReportCard title="Job Pipeline" rows={jobPipeline} theme={theme} />
        <ReportCard title="Requisition Pipeline" rows={requisitionPipeline} theme={theme} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportCard({
  title,
  rows,
  theme,
}: {
  title: string;
  rows: { label: string; count: number }[];
  theme: ReturnType<typeof useTheme>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={{ gap: 10 }}>
        {rows.map((row) => (
          <View key={row.label} style={{ gap: 4 }}>
            <View style={styles.rowHeader}>
              <ThemedText type="small" style={styles.rowLabel}>
                {row.label.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {row.count}
              </ThemedText>
            </View>
            <View style={[styles.barTrack, { backgroundColor: theme.background }]}>
              <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(row.count / max) * 100}%` }]} />
            </View>
          </View>
        ))}
        {rows.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No data yet.
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 16, gap: 12 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { textTransform: 'capitalize' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});
