import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLatestAnalysisReports, gradeFromScore, reanalyzeApplication, type CandidateAnalysisReport } from '@/lib/api/analytics';
import { listMyJobs } from '@/lib/api/recruiter';

type ScoreFilter = '' | 'high' | 'medium' | 'low';

// Ported from sql-skreenit's dashboard/analysis.html + dashboard/js/analysis.js.
// Reached after triggering "Analyze Responses" on an application (see the button
// added to (recruiter)/applications/[id].tsx) -- no persistent nav entry on web
// either, so this mirrors that contextual-only access pattern via the ATS
// Services dashboard card instead of a tab.
export default function AnalysisReportsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [jobId, setJobId] = useState('');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('');
  const [selected, setSelected] = useState<CandidateAnalysisReport | null>(null);

  const reportsQuery = useQuery({ queryKey: ['recruiter', 'analysis-reports'], queryFn: getLatestAnalysisReports });
  const jobsQuery = useQuery({ queryKey: ['recruiter', 'jobs', 'all'], queryFn: () => listMyJobs({ pageSize: 200 }) });
  const jobOptions = useMemo(
    () => [{ label: 'All jobs', value: '' }, ...(jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id }))],
    [jobsQuery.data],
  );

  const reports = reportsQuery.data?.data ?? [];
  const filtered = reports.filter((r) => {
    if (search.trim() && !r.candidate_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (jobId && r.job_id !== jobId) return false;
    if (scoreFilter === 'high' && r.avg_score < 70) return false;
    if (scoreFilter === 'medium' && (r.avg_score < 40 || r.avg_score >= 70)) return false;
    if (scoreFilter === 'low' && r.avg_score >= 40) return false;
    return true;
  });

  const avgScore = reports.length ? Math.round(reports.reduce((s, r) => s + r.avg_score, 0) / reports.length) : 0;
  const avgWpm = reports.length ? Math.round(reports.reduce((s, r) => s + r.avg_wpm, 0) / reports.length) : 0;
  const highPerformers = reports.filter((r) => r.avg_score >= 70).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Video Analysis Reports</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          <StatTile label="Total Analyzed" value={String(reports.length)} />
          <StatTile label="Avg Score" value={String(avgScore)} />
          <StatTile label="Avg Pace (WPM)" value={String(avgWpm)} />
          <StatTile label="High Performers" value={String(highPerformers)} />
        </View>

        <TextField label="Search candidate" value={search} onChangeText={setSearch} placeholder="Candidate name" />
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField label="Job" value={jobId} options={jobOptions} onChange={setJobId} />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Score"
              value={scoreFilter}
              options={[
                { label: 'Any score', value: '' },
                { label: 'High (≥70)', value: 'high' },
                { label: 'Medium (40-69)', value: 'medium' },
                { label: 'Low (<40)', value: 'low' },
              ]}
              onChange={(v) => setScoreFilter(v as ScoreFilter)}
            />
          </View>
        </View>

        {reportsQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : filtered.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No analyzed responses yet.
          </ThemedText>
        ) : (
          filtered.map((r) => <ReportCard key={r.application_id} report={r} onPress={() => setSelected(r)} />)
        )}
      </ScrollView>

      <AnalysisDetailModal report={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
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

function ReportCard({ report, onPress }: { report: CandidateAnalysisReport; onPress: () => void }) {
  const theme = useTheme();
  const grade = gradeFromScore(report.avg_score);
  return (
    <Pressable style={[styles.card, { borderColor: theme.border }]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">{report.candidate_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {report.job_title}
          </ThemedText>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${grade.color}22` }]}>
          <ThemedText type="smallBold" style={{ color: grade.color }}>
            {Math.round(report.avg_score)}
          </ThemedText>
          <ThemedText type="small" style={{ color: grade.color }}>
            {grade.label}
          </ThemedText>
        </View>
      </View>
      <View style={styles.metaRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {Math.round(report.avg_wpm)} WPM · {Math.round(report.avg_filler)} fillers · {Math.round(report.avg_face)}% face
        </ThemedText>
      </View>
      <View style={[styles.emotionChip, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small">{report.dominant_emotion}</ThemedText>
      </View>
    </Pressable>
  );
}

function AnalysisDetailModal({ report, onClose }: { report: CandidateAnalysisReport | null; onClose: () => void }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const reanalyzeMutation = useMutation({
    mutationFn: (applicationId: string) => reanalyzeApplication(applicationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'analysis-reports'] }),
  });

  if (!report) return null;
  const grade = gradeFromScore(report.avg_score);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="subtitle">{report.candidate_name}</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome6 name="xmark" size={18} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <View style={[styles.overallCard, { backgroundColor: `${grade.color}15` }]}>
              <ThemedText type="title" style={{ color: grade.color }}>
                {Math.round(report.avg_score)} · {grade.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Overall score across {report.total_questions} question(s)
              </ThemedText>
            </View>

            {report.analyses
              .slice()
              .sort((a, b) => a.question_index - b.question_index)
              .map((qa) => {
                const s = qa.analysis.summary;
                const qGrade = gradeFromScore(s.overall_score);
                return (
                  <ThemedView key={qa.question_index} style={[styles.questionCard, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      Q{qa.question_index + 1}: {qa.question}
                    </ThemedText>
                    <View style={styles.qaMetaRow}>
                      <View style={[styles.qaBadge, { backgroundColor: `${qGrade.color}22` }]}>
                        <ThemedText type="small" style={{ color: qGrade.color }}>
                          {Math.round(s.overall_score)} · {qGrade.label}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {s.speaking_pace} WPM · {s.filler_words} fillers
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Face presence {s.face_presence}% · Confidence {s.confidence_score} · {s.dominant_emotion} ·{' '}
                      {s.duration}s
                    </ThemedText>
                  </ThemedView>
                );
              })}

            <Button
              title="Re-Analyze"
              variant="secondary"
              icon="rotate"
              loading={reanalyzeMutation.isPending}
              onPress={() => reanalyzeMutation.mutate(report.application_id)}
            />
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: { flexBasis: '48%', borderRadius: Radius.md, padding: 12, gap: 2 },
  filterRow: { flexDirection: 'row', gap: 12 },
  empty: { textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  scoreBadge: { alignItems: 'center', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 6 },
  metaRow: { flexDirection: 'row' },
  emotionChip: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingTop: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  overallCard: { borderRadius: Radius.lg, padding: 16, alignItems: 'center', gap: 4 },
  questionCard: { borderWidth: 1, borderRadius: Radius.md, padding: 12, gap: 6 },
  qaMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qaBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
});
