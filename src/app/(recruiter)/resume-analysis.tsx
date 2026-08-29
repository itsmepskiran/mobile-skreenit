import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ScheduleInterviewModal,
  type ScheduleInterviewContext,
} from '@/components/schedule-interview-modal';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { listMyJobs } from '@/lib/api/recruiter';
import {
  analyzeResume,
  checkDetailedAnalysisAccess,
  downloadBasicReport,
  downloadDetailedReport,
  startDetailedAnalysis,
  type ResumeAnalysisResult,
} from '@/lib/api/resume-analysis';

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: '#2f855a',
  Medium: '#c05621',
  Hard: '#c53030',
};

export default function ResumeAnalysisScreen() {
  const theme = useTheme();
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [scheduleContext, setScheduleContext] = useState<ScheduleInterviewContext | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [detailedJobId, setDetailedJobId] = useState('');

  const detailedAccessQuery = useQuery({
    queryKey: ['recruiter', 'detailed-analysis-access'],
    queryFn: checkDetailedAnalysisAccess,
    enabled: result != null,
  });

  const myJobsQuery = useQuery({
    queryKey: ['recruiter', 'jobs', 'all'],
    queryFn: () => listMyJobs({ pageSize: 200 }),
    enabled: detailedAccessQuery.data?.data.accessible === true,
  });
  const jobOptions = (myJobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id }));

  const startDetailedMutation = useMutation({
    mutationFn: () => {
      const email = result?.insights.contact.emails[0];
      if (!email) throw new Error("This resume has no email address — Detailed Analysis needs one to invite the candidate.");
      if (!detailedJobId) throw new Error('Please select a job first.');
      return startDetailedAnalysis({
        jobId: detailedJobId,
        candidateName: result?.insights.name || file?.name.replace(/\.[^.]+$/, '') || 'Candidate',
        candidateEmail: email,
        insights: result!.insights,
      });
    },
    onSuccess: (res) => {
      router.push({
        pathname: '/(recruiter)/detailed-analysis/[requestId]',
        params: { requestId: res.data.detailed_analysis_id },
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (f: NonNullable<typeof file>) => analyzeResume(f),
    onSuccess: (res) => {
      setResult(res.data);
      setShowQuestions(false);
    },
  });

  const downloadReportMutation = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('Please run Analyse Resume first.');
      return downloadDetailedReport({
        resume_filename: file?.name ?? 'resume',
        insights: result.insights,
        questions: result.questions,
        source: result.source,
        model: result.model,
        reason: result.reason,
      });
    },
  });

  const downloadBasicMutation = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('Please run Analyse Resume first.');
      return downloadBasicReport({
        resume_filename: file?.name ?? 'resume',
        insights: result.insights,
        questions: result.questions,
        source: result.source,
        model: result.model,
        reason: result.reason,
      });
    },
  });

  const pickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    const picked_file = { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' };
    setFile(picked_file);
    setResult(null);
    setScheduled(false);
    analyzeMutation.mutate(picked_file);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setShowQuestions(false);
    setScheduled(false);
  };

  const openSchedule = () => {
    const insights = result?.insights;
    setScheduleContext({
      candidates: [
        {
          name: insights?.name ?? file?.name.replace(/\.[^.]+$/, '') ?? 'Candidate',
          email: insights?.contact.emails[0],
          phone: insights?.contact.phones[0],
        },
      ],
    });
  };

  const insights = result?.insights;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Resume Analysis</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Upload a candidate&apos;s resume for AI-generated profile insights and interview questions.
        </ThemedText>

        {!file ? (
          <Pressable style={[styles.dropzone, { borderColor: theme.border }]} onPress={pickFile}>
            <FontAwesome6 name="file-arrow-up" size={22} color={theme.primary} />
            <ThemedText type="smallBold">Choose a resume (PDF, DOC, DOCX)</ThemedText>
          </Pressable>
        ) : (
          <ThemedView style={[styles.fileRow, { borderColor: theme.border }]}>
            <FontAwesome6 name="file-lines" size={16} color={theme.primary} />
            <ThemedText type="small" numberOfLines={1} style={styles.fileName}>
              {file.name}
            </ThemedText>
            <Pressable onPress={reset} hitSlop={8}>
              <FontAwesome6 name="xmark" size={16} color={theme.textSecondary} />
            </Pressable>
          </ThemedView>
        )}

        {analyzeMutation.isPending ? (
          <ThemedView style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
              Analyzing resume — generating interview questions with difficulty levels. This can take up to a
              couple of minutes.
            </ThemedText>
          </ThemedView>
        ) : null}

        {analyzeMutation.isError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {analyzeMutation.error instanceof ApiError ? analyzeMutation.error.message : 'Could not analyze this resume.'}
          </ThemedText>
        ) : null}

        {insights ? (
          <>
            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">Profile Insights</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {insights.summary}
              </ThemedText>

              <View style={styles.statsGrid}>
                <StatTile label="Words" value={String(insights.stats.word_count)} />
                <StatTile label="Skills found" value={String(insights.stats.skills_count)} />
                <StatTile
                  label="Est. experience"
                  value={insights.stats.estimated_experience_years != null ? `${insights.stats.estimated_experience_years} yrs` : '—'}
                />
                <StatTile label="Profile completeness" value={`${insights.stats.profile_completeness_pct}%`} />
              </View>

              {insights.domains.length ? (
                <View style={styles.chipRow}>
                  {insights.domains.map((d) => (
                    <View key={d} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="small">{d}</ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}

              <InsightList theme={theme} title="Strengths" icon="circle-check" color="#2f855a" items={insights.strengths} />
              <InsightList theme={theme} title="Gaps" icon="triangle-exclamation" color="#c05621" items={insights.gaps} />
              <InsightList theme={theme} title="Recommendations" icon="lightbulb" color={theme.primary} items={insights.recommendations} />
              <InsightList
                theme={theme}
                title="Skills Depth"
                icon="gauge-high"
                color="#0369a1"
                items={(insights.skills_depth ?? []).map((s) => `${s.skill} — ${s.depth_signal}: ${s.reasoning}`)}
              />

              {insights.communication_signals ? (
                <View style={styles.insightSection}>
                  <ThemedText type="smallBold">Communication Signals</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.insightText}>
                    {insights.communication_signals}
                  </ThemedText>
                </View>
              ) : null}

              {insights.career_trajectory ? (
                <View style={styles.insightSection}>
                  <ThemedText type="smallBold">Career Trajectory</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.insightText}>
                    {insights.career_trajectory}
                  </ThemedText>
                </View>
              ) : null}
            </ThemedView>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1 }]}
                onPress={openSchedule}
              >
                <FontAwesome6 name="calendar-plus" size={13} color="#fff" />
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  Schedule Interview
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1, flex: 1 }]}
                onPress={() => setShowQuestions((v) => !v)}
              >
                <FontAwesome6 name="clipboard-question" size={13} color={theme.text} />
                <ThemedText type="small">{showQuestions ? 'Hide Questions' : 'Interview Questions'}</ThemedText>
              </Pressable>
            </View>

            {scheduled ? (
              <ThemedText type="small" style={{ color: '#2f855a' }}>
                Interview scheduled — check the Interviews tab.
              </ThemedText>
            ) : null}

            {showQuestions && result ? (
              <ThemedView style={[styles.card, { borderColor: theme.border }]}>
                <ThemedText type="subtitle">Generated Interview Questions</ThemedText>
                {result.questions.map((q, i) => (
                  <View key={i} style={[styles.questionCard, { borderColor: theme.border }]}>
                    <View style={styles.questionMetaRow}>
                      <View style={[styles.difficultyBadge, { backgroundColor: `${DIFFICULTY_COLOR[q.difficulty] ?? theme.primary}22` }]}>
                        <ThemedText type="small" style={{ color: DIFFICULTY_COLOR[q.difficulty] ?? theme.primary, fontWeight: '600' }}>
                          {q.difficulty}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {q.category}
                      </ThemedText>
                    </View>
                    <ThemedText type="small">{q.question}</ThemedText>
                  </View>
                ))}
              </ThemedView>
            ) : null}

            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.detailedHeaderRow}>
                <FontAwesome6 name="file-pdf" size={14} color={theme.primary} />
                <ThemedText type="subtitle">Basic Report</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Free summary PDF of the insights and questions above.
              </ThemedText>
              <Pressable
                style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => downloadBasicMutation.mutate()}
                disabled={downloadBasicMutation.isPending}
              >
                {downloadBasicMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <FontAwesome6 name="file-arrow-down" size={13} color={theme.text} />
                )}
                <ThemedText type="small">
                  {downloadBasicMutation.isPending ? 'Preparing report…' : 'Download Basic Report'}
                </ThemedText>
              </Pressable>
              {downloadBasicMutation.isError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {downloadBasicMutation.error instanceof ApiError
                    ? downloadBasicMutation.error.message
                    : 'Failed to download the report. Please try again.'}
                </ThemedText>
              ) : null}
            </ThemedView>

            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.detailedHeaderRow}>
                <FontAwesome6 name="crown" size={14} color={theme.primary} />
                <ThemedText type="subtitle">Detailed Analysis</ThemedText>
              </View>
              {detailedAccessQuery.data?.data.accessible ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Detailed analysis is available on your plan — download the full PDF report below.
                  </ThemedText>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.primary }]}
                    onPress={() => downloadReportMutation.mutate()}
                    disabled={downloadReportMutation.isPending}
                  >
                    {downloadReportMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <FontAwesome6 name="file-arrow-down" size={13} color="#fff" />
                    )}
                    <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                      {downloadReportMutation.isPending ? 'Preparing report…' : 'Download Detailed Report'}
                    </ThemedText>
                  </Pressable>
                  {downloadReportMutation.isError ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {downloadReportMutation.error instanceof ApiError
                        ? downloadReportMutation.error.message
                        : 'Failed to download the report. Please try again.'}
                    </ThemedText>
                  ) : null}

                  <View style={[styles.detailedDivider, { borderColor: theme.border }]} />

                  <ThemedText type="smallBold">Match Against a Job</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Invite this candidate to take the assessments configured for one of your jobs — once they
                    finish, their resume insights and assessment scores are merged into one report.
                  </ThemedText>
                  <SelectField
                    label="Job"
                    searchable
                    value={detailedJobId}
                    options={jobOptions}
                    onChange={setDetailedJobId}
                    placeholder="Select a job"
                  />
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.primary }]}
                    onPress={() => startDetailedMutation.mutate()}
                    disabled={startDetailedMutation.isPending || !detailedJobId}
                  >
                    {startDetailedMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <FontAwesome6 name="paper-plane" size={13} color="#fff" />
                    )}
                    <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                      {startDetailedMutation.isPending ? 'Starting…' : 'Start Detailed Analysis'}
                    </ThemedText>
                  </Pressable>
                  {startDetailedMutation.isError ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {startDetailedMutation.error instanceof ApiError || startDetailedMutation.error instanceof Error
                        ? startDetailedMutation.error.message
                        : 'Could not start detailed analysis. Please try again.'}
                    </ThemedText>
                  ) : null}
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Unlock merged resume + assessment scoring with Recruiter Premium.
                </ThemedText>
              )}
            </ThemedView>
          </>
        ) : null}
      </ScrollView>

      <ScheduleInterviewModal
        visible={scheduleContext != null}
        context={scheduleContext}
        onClose={() => setScheduleContext(null)}
        onScheduled={() => {
          setScheduleContext(null);
          setScheduled(true);
        }}
      />
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function InsightList({
  theme,
  title,
  icon,
  color,
  items,
}: {
  theme: ReturnType<typeof useTheme>;
  title: string;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  color: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <View style={styles.insightSection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {items.map((item, i) => (
        <View key={i} style={styles.insightRow}>
          <FontAwesome6 name={icon} size={12} color={color} />
          <ThemedText type="small" style={styles.insightText}>
            {item}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  dropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
  },
  fileName: { flex: 1 },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: { flexBasis: '48%', borderRadius: Radius.md, padding: 10, gap: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  insightSection: { gap: 6 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightText: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 12 },
  questionCard: { borderWidth: 1, borderRadius: Radius.md, padding: 12, gap: 6 },
  questionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  difficultyBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  detailedHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailedDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 4 },
});
