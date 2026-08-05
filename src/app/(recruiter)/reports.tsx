import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  downloadReportExport,
  getAlertPreferences,
  getJobBenchmark,
  getJobInsights,
  getMetricsBottlenecks,
  getMetricsFunnel,
  getMetricsSummary,
  getReportAlerts,
  getReportPreferences,
  getReportsAccess,
  updateAlertPreferences,
  updateReportPreferences,
  type AlertPreferences,
  type ReportPreferences,
} from '@/lib/api/dashboard-metrics';
import { listMyJobs } from '@/lib/api/recruiter';

type Tab = 'overview' | 'insights' | 'benchmark' | 'scheduled' | 'alerts';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'insights', label: 'Insights' },
  { key: 'benchmark', label: 'Benchmark' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'alerts', label: 'Alerts' },
];

// Ported from sql-skreenit's dashboard/reports.html + dashboard/js/reports.js.
// Gated behind "any Premium Service" (GET /recruiter/reports/access) per the product
// decision to consolidate all report-type features into one hub under ATS Services.
export default function ReportsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const [jobId, setJobId] = useState('');

  const accessQuery = useQuery({ queryKey: ['recruiter', 'reports', 'access'], queryFn: getReportsAccess });
  const accessible = accessQuery.data?.data.accessible ?? false;

  const jobsQuery = useQuery({
    queryKey: ['recruiter', 'jobs', 'all'],
    queryFn: () => listMyJobs({ pageSize: 200 }),
    enabled: accessible,
  });
  const jobOptions = useMemo(
    () => [{ label: 'All jobs', value: '' }, ...(jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id }))],
    [jobsQuery.data],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Reports</ThemedText>
      </View>

      {accessQuery.isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : !accessible ? (
        <View style={styles.upsell}>
          <FontAwesome6 name="crown" size={32} color="#d97706" />
          <ThemedText type="title" style={styles.upsellTitle}>
            Reports is a Premium feature
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.upsellText}>
            Subscribe to any recruiter plan to unlock real-time metrics, AI insights, benchmarking, scheduled digests,
            and bottleneck alerts.
          </ThemedText>
          <Button title="Subscribe Now" icon="bolt" onPress={() => router.push('/(recruiter)/premium')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <SelectField label="Job" value={jobId} options={jobOptions} onChange={setJobId} />

          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabBtn,
                  tab === t.key && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={tab === t.key ? { color: theme.primary } : undefined}
                  themeColor={tab === t.key ? undefined : 'textSecondary'}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {tab === 'overview' && <OverviewTab jobId={jobId} />}
          {tab === 'insights' && <InsightsTab jobId={jobId} />}
          {tab === 'benchmark' && <BenchmarkTab jobId={jobId} />}
          {tab === 'scheduled' && <ScheduledTab />}
          {tab === 'alerts' && <AlertsTab />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function OverviewTab({ jobId }: { jobId: string }) {
  const theme = useTheme();
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExporting(format);
    try {
      await downloadReportExport(format, jobId || undefined);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const summaryQuery = useQuery({
    queryKey: ['recruiter', 'reports', 'summary', jobId],
    queryFn: () => getMetricsSummary(jobId || undefined),
  });
  const funnelQuery = useQuery({
    queryKey: ['recruiter', 'reports', 'funnel', jobId],
    queryFn: () => getMetricsFunnel(jobId || undefined),
  });
  const bottlenecksQuery = useQuery({
    queryKey: ['recruiter', 'reports', 'bottlenecks', jobId],
    queryFn: () => getMetricsBottlenecks(jobId || undefined),
  });

  const summary = summaryQuery.data?.data;
  const funnel = (funnelQuery.data?.data.funnel ?? []).filter((f) => f.reached > 0);
  const bottlenecks = bottlenecksQuery.data?.data.bottlenecks ?? [];
  const screenWidth = Dimensions.get('window').width - 40;

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.exportRow}>
        <Button
          title={exporting === 'pdf' ? 'Generating…' : 'Export PDF'}
          variant="secondary"
          icon="file-pdf"
          loading={exporting === 'pdf'}
          disabled={exporting !== null}
          onPress={() => handleExport('pdf')}
        />
        <Button
          title={exporting === 'csv' ? 'Generating…' : 'Export CSV'}
          variant="secondary"
          icon="file-csv"
          loading={exporting === 'csv'}
          disabled={exporting !== null}
          onPress={() => handleExport('csv')}
        />
      </View>

      <View style={styles.statsGrid}>
        <StatTile
          label="Avg. Time to Hire (days)"
          value={summary?.time_to_hire_avg_days != null ? String(summary.time_to_hire_avg_days) : '–'}
        />
        <StatTile label="Hired" value={String(summary?.hired_count ?? 0)} />
        <StatTile
          label="Interview No-show Rate"
          value={summary?.interview_no_show_rate != null ? `${Math.round(summary.interview_no_show_rate * 100)}%` : '–'}
        />
        <StatTile
          label="Biggest Bottleneck"
          value={bottlenecks[0]?.stage ? bottlenecks[0].stage.replace(/_/g, ' ') : '–'}
        />
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
          Funnel Conversion
        </ThemedText>
        {funnelQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : funnel.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No funnel data yet.
          </ThemedText>
        ) : (
          <BarChart
            data={{
              labels: funnel.map((f) => f.stage.replace(/_/g, ' ').slice(0, 8)),
              datasets: [{ data: funnel.map((f) => f.reached) }],
            }}
            width={screenWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundGradientFrom: theme.background,
              backgroundGradientTo: theme.background,
              decimalPlaces: 0,
              color: () => theme.primary,
              labelColor: () => theme.textSecondary,
              barPercentage: 0.6,
            }}
            style={{ borderRadius: Radius.md }}
          />
        )}
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
          Time in Stage (Bottleneck View)
        </ThemedText>
        {bottlenecksQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : bottlenecks.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No stage data yet.
          </ThemedText>
        ) : (
          bottlenecks.map((b) => (
            <View key={b.stage} style={styles.bottleneckRow}>
              <ThemedText type="small">{b.stage.replace(/_/g, ' ') || '(unknown)'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {b.avg_dwell_hours != null ? `${b.avg_dwell_hours}h avg` : '–'} · {b.applications_in_stage} app(s)
              </ThemedText>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function InsightsTab({ jobId }: { jobId: string }) {
  const theme = useTheme();
  const insightsQuery = useQuery({
    queryKey: ['recruiter', 'reports', 'insights', jobId],
    queryFn: () => getJobInsights(jobId),
    enabled: Boolean(jobId),
  });

  if (!jobId) {
    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Select a job above to see AI insights for its applicant pool.
        </ThemedText>
      </View>
    );
  }

  if (insightsQuery.isLoading) {
    return <ActivityIndicator color={theme.primary} />;
  }

  const insights = insightsQuery.data?.data;
  const skills = insights?.common_missing_skills ?? [];
  const emotions = Object.entries(insights?.avg_emotion_distribution ?? {}).sort((a, b) => b[1] - a[1]);
  const topEmotion = emotions[0]?.[0];

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
          Common Missing Skills
        </ThemedText>
        {skills.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No resume/JD match data for this job yet.
          </ThemedText>
        ) : (
          skills.map((s) => (
            <View key={s.skill} style={styles.bottleneckRow}>
              <ThemedText type="small">{s.skill}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.count} candidate(s)
              </ThemedText>
            </View>
          ))
        )}
      </View>

      <View style={styles.statsGrid}>
        <StatTile label="Avg. Communication Score" value={insights?.avg_communication_score != null ? String(insights.avg_communication_score) : '–'} />
        <StatTile label="Avg. Speaking Pace (wpm)" value={insights?.avg_speaking_pace != null ? String(insights.avg_speaking_pace) : '–'} />
        <StatTile label="Avg. Filler Words" value={insights?.avg_filler_word_rate != null ? String(insights.avg_filler_word_rate) : '–'} />
        <StatTile label="Most Common Emotion" value={topEmotion ?? '–'} />
      </View>
    </View>
  );
}

function BenchmarkTab({ jobId }: { jobId: string }) {
  const theme = useTheme();
  const benchmarkQuery = useQuery({
    queryKey: ['recruiter', 'reports', 'benchmark', jobId],
    queryFn: () => getJobBenchmark(jobId),
    enabled: Boolean(jobId),
  });

  if (!jobId) {
    return (
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Select a job above to compare it against similar closed jobs.
        </ThemedText>
      </View>
    );
  }

  if (benchmarkQuery.isLoading) {
    return <ActivityIndicator color={theme.primary} />;
  }

  const benchmark = benchmarkQuery.data?.data;
  const thisJob = benchmark?.this_job;
  const deptAvg = benchmark?.department_average;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
        This Job vs. Department Average
      </ThemedText>

      <View style={styles.benchmarkRow}>
        <View style={{ flex: 1 }} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.benchmarkCol}>
          This Job
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.benchmarkCol}>
          Dept. Avg
        </ThemedText>
      </View>
      <View style={styles.benchmarkRow}>
        <ThemedText type="small" style={{ flex: 1 }}>Time to Hire (days)</ThemedText>
        <ThemedText type="smallBold" style={styles.benchmarkCol}>
          {thisJob?.time_to_hire_avg_days ?? '–'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.benchmarkCol}>
          {deptAvg?.time_to_hire_avg_days ?? '–'}
        </ThemedText>
      </View>
      <View style={styles.benchmarkRow}>
        <ThemedText type="small" style={{ flex: 1 }}>Hired Rate</ThemedText>
        <ThemedText type="smallBold" style={styles.benchmarkCol}>
          {thisJob?.hired_rate != null ? `${Math.round(thisJob.hired_rate * 100)}%` : '–'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.benchmarkCol}>
          {deptAvg?.hired_rate != null ? `${Math.round(deptAvg.hired_rate * 100)}%` : '–'}
        </ThemedText>
      </View>

      {benchmark?.message ? (
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 12 }}>
          {benchmark.message}
        </ThemedText>
      ) : null}
    </View>
  );
}

function ScheduledTab() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const prefsQuery = useQuery({ queryKey: ['recruiter', 'reports', 'preferences'], queryFn: getReportPreferences });

  const [digestEnabled, setDigestEnabled] = useState<boolean | null>(null);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | null>(null);

  const enabled = digestEnabled ?? prefsQuery.data?.data.digest_enabled ?? false;
  const freq = frequency ?? prefsQuery.data?.data.frequency ?? 'weekly';

  const saveMutation = useMutation({
    mutationFn: (prefs: ReportPreferences) => updateReportPreferences(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'reports', 'preferences'] }),
  });

  if (prefsQuery.isLoading) {
    return <ActivityIndicator color={theme.primary} />;
  }

  const handleSave = () => {
    saveMutation.mutate({ digest_enabled: enabled, frequency: freq });
  };

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
        Scheduled Digest
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 12 }}>
        Get a summary of your hiring metrics emailed to you automatically.
      </ThemedText>

      <View style={styles.toggleRow}>
        <ThemedText type="small">Email me a recruiter report</ThemedText>
        <Switch
          value={enabled}
          onValueChange={(v) => setDigestEnabled(v)}
          trackColor={{ true: theme.primary }}
        />
      </View>

      <View style={styles.tabRow}>
        {(['weekly', 'monthly'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFrequency(f)}
            style={[
              styles.freqPill,
              { borderColor: theme.border },
              freq === f && { borderColor: theme.primary, backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText type="small" style={freq === f ? { color: theme.primary } : undefined}>
              {f === 'weekly' ? 'Weekly' : 'Monthly'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Button
        title={saveMutation.isPending ? 'Saving…' : saveMutation.isSuccess ? 'Saved' : 'Save'}
        loading={saveMutation.isPending}
        onPress={handleSave}
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

function AlertsTab() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const alertsQuery = useQuery({ queryKey: ['recruiter', 'reports', 'alerts'], queryFn: getReportAlerts });
  const prefsQuery = useQuery({ queryKey: ['recruiter', 'reports', 'alert-preferences'], queryFn: getAlertPreferences });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [staleDays, setStaleDays] = useState<string | null>(null);
  const [lowConversionPct, setLowConversionPct] = useState<string | null>(null);

  const alertsEnabled = enabled ?? prefsQuery.data?.data.alerts_enabled ?? true;
  const staleDaysValue = staleDays ?? String(prefsQuery.data?.data.stale_days_threshold ?? 7);
  const lowConversionValue = lowConversionPct ?? String(prefsQuery.data?.data.low_conversion_threshold_pct ?? 20);

  const saveMutation = useMutation({
    mutationFn: (prefs: AlertPreferences) => updateAlertPreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'reports', 'alert-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'reports', 'alerts'] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      alerts_enabled: alertsEnabled,
      stale_days_threshold: parseInt(staleDaysValue, 10) || 7,
      low_conversion_threshold_pct: parseInt(lowConversionValue, 10) || 20,
    });
  };

  const stale = alertsQuery.data?.data.stale_applications ?? [];
  const lowConversion = alertsQuery.data?.data.low_conversion_jobs ?? [];

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
          Stale Applications
        </ThemedText>
        {alertsQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : stale.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No stale applications right now.
          </ThemedText>
        ) : (
          stale.map((s) => (
            <View key={s.application_id} style={styles.bottleneckRow}>
              <ThemedText type="small">{s.job_title} — {s.status.replace(/_/g, ' ')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.days_stale} days
              </ThemedText>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
          Low-Conversion Jobs
        </ThemedText>
        {alertsQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : lowConversion.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No low-conversion jobs right now.
          </ThemedText>
        ) : (
          lowConversion.map((j) => (
            <View key={j.job_id} style={styles.bottleneckRow}>
              <ThemedText type="small">{j.job_title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {j.hired_rate_pct}% ({j.hired_count}/{j.total_applications})
              </ThemedText>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
          Alert Settings
        </ThemedText>
        <View style={styles.toggleRow}>
          <ThemedText type="small">Enable daily alerts</ThemedText>
          <Switch value={alertsEnabled} onValueChange={setEnabled} trackColor={{ true: theme.primary }} />
        </View>
        <TextField
          label="Stale after (days)"
          value={staleDaysValue}
          onChangeText={setStaleDays}
          keyboardType="number-pad"
        />
        <TextField
          label="Low conversion threshold (%)"
          value={lowConversionValue}
          onChangeText={setLowConversionPct}
          keyboardType="number-pad"
        />
        <Button
          title={saveMutation.isPending ? 'Saving…' : saveMutation.isSuccess ? 'Saved' : 'Save'}
          loading={saveMutation.isPending}
          onPress={handleSave}
          style={{ marginTop: 12 }}
        />
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 16 },
  upsell: { alignItems: 'center', gap: 10, padding: 32, marginTop: 20 },
  upsellTitle: { textAlign: 'center' },
  upsellText: { textAlign: 'center', marginBottom: 8 },
  tabRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: { flexBasis: '48%', borderRadius: Radius.md, padding: 12, gap: 2 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14 },
  bottleneckRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  benchmarkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  benchmarkCol: { width: 80, textAlign: 'right' },
  exportRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  freqPill: { borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
});
