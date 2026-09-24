import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import {
  downloadDetailedAnalysisReport,
  getDetailedAnalysisStatus,
  type DetailedAnalysisHireRecommendation,
  type DetailedAnalysisJdMatch,
  type DetailedAnalysisTargetedQuestion,
} from '@/lib/api/resume-analysis';

// Mirrors sql-skreenit's VERDICT_STYLE (assets/assets/js/resume-insights-renderer.js).
const VERDICT_STYLE: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof FontAwesome6>['name'] }> = {
  strong_fit: { label: 'Strong Fit', color: '#16a34a', bg: '#dcfce7', icon: 'circle-check' },
  fit: { label: 'Fit', color: '#2563eb', bg: '#dbeafe', icon: 'circle-half-stroke' },
  weak_fit: { label: 'Weak Fit', color: '#dc2626', bg: '#fee2e2', icon: 'circle-exclamation' },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: '#2f855a',
  Medium: '#c05621',
  Hard: '#c53030',
};

// Polls /recruiter/detailed-analysis/{id}/status until the invited candidate
// finishes their assessment and the resume + assessment results get merged
// server-side — see routers/detailed_analysis.py for the full state machine
// (awaiting_assessment -> processing -> completed/failed).
export default function DetailedAnalysisStatusScreen() {
  const theme = useTheme();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const statusQuery = useQuery({
    queryKey: ['recruiter', 'detailed-analysis', requestId],
    queryFn: () => getDetailedAnalysisStatus(requestId),
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === 'completed' || status === 'failed' ? false : 5000;
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () => downloadDetailedAnalysisReport(requestId),
  });

  const data = statusQuery.data?.data;
  const merged = data?.merged_report;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/resume-analysis')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Detailed Analysis</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {statusQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : statusQuery.isError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            Could not load this request. Pull down to retry.
          </ThemedText>
        ) : data?.status === 'completed' && merged ? (
          <>
            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.statusRow}>
                <FontAwesome6 name="circle-check" size={16} color="#2f855a" />
                <ThemedText type="subtitle">Ready</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {data.candidate_name} completed the assessment. Resume insights and assessment scores have been
                merged into one report.
              </ThemedText>
            </ThemedView>

            <HireRecommendationCard recommendation={merged.hire_recommendation} />
            <JdMatchCard jdMatch={merged.jd_match} />

            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">Assessment Results</ThemedText>
              {merged.assessment_results.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No scored assessments found.
                </ThemedText>
              ) : (
                merged.assessment_results.map((r) => (
                  <View key={r.session_id} style={[styles.resultRow, { borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{r.assessment_title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {r.summary}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {Math.round(r.score)}%
                    </ThemedText>
                  </View>
                ))
              )}
            </ThemedView>

            <TargetedQuestionsCard questions={merged.targeted_questions} />

            <Button
              title={downloadMutation.isPending ? 'Preparing report…' : 'Download Report'}
              icon={downloadMutation.isPending ? undefined : 'file-arrow-down'}
              loading={downloadMutation.isPending}
              onPress={() => downloadMutation.mutate()}
            />
            {downloadMutation.isError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {downloadMutation.error instanceof ApiError ? downloadMutation.error.message : 'Download failed. Please try again.'}
              </ThemedText>
            ) : null}
          </>
        ) : data?.status === 'failed' ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <FontAwesome6 name="triangle-exclamation" size={16} color={theme.danger} />
            <ThemedText type="small" themeColor="textSecondary">
              This detailed analysis could not be completed.
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="subtitle">Waiting on {data?.candidate_name ?? 'the candidate'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data?.status === 'processing'
                ? 'Assessment submitted — scoring in progress. This can take a minute.'
                : "We've sent them an assessment invite. This page updates automatically once they finish."}
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HireRecommendationCard({ recommendation }: { recommendation?: DetailedAnalysisHireRecommendation | null }) {
  if (!recommendation || !recommendation.available) return null;
  const style = VERDICT_STYLE[recommendation.verdict] ?? VERDICT_STYLE.fit;
  return (
    <View style={[styles.card, { borderColor: style.color, backgroundColor: style.bg }]}>
      <View style={styles.statusRow}>
        <FontAwesome6 name={style.icon} size={16} color={style.color} />
        <ThemedText type="subtitle" style={{ color: style.color }}>
          {style.label}
        </ThemedText>
      </View>
      {recommendation.rationale ? <ThemedText type="small">{recommendation.rationale}</ThemedText> : null}
      {recommendation.suggested_next_step ? (
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="smallBold">Suggested next step: </ThemedText>
          {recommendation.suggested_next_step}
        </ThemedText>
      ) : null}
    </View>
  );
}

function JdMatchCard({ jdMatch }: { jdMatch?: DetailedAnalysisJdMatch | null }) {
  const theme = useTheme();
  if (!jdMatch || Object.keys(jdMatch).length === 0) return null;
  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.statusRow}>
        <FontAwesome6 name="bullseye" size={14} color="#7c3aed" />
        <ThemedText type="subtitle">Job Description Match</ThemedText>
      </View>
      {typeof jdMatch.match_score === 'number' ? (
        <View style={[styles.statTile, { backgroundColor: theme.backgroundElement, alignSelf: 'flex-start' }]}>
          <ThemedText type="smallBold">{jdMatch.match_score}%</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            JD Match Score
          </ThemedText>
        </View>
      ) : null}

      <SkillChipGroup title="Matched Skills" icon="check" color="#16a34a" skills={jdMatch.matched_skills} />
      <SkillChipGroup title="Missing Skills" icon="xmark" color="#dc2626" skills={jdMatch.missing_skills} />

      {jdMatch.experience_fit ? (
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="smallBold">Experience Fit: </ThemedText>
          {jdMatch.experience_fit}
        </ThemedText>
      ) : null}
      {jdMatch.education_fit ? (
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="smallBold">Education Fit: </ThemedText>
          {jdMatch.education_fit}
        </ThemedText>
      ) : null}
      {jdMatch.concerns && jdMatch.concerns.length > 0 ? (
        <View style={styles.insightSection}>
          <View style={styles.statusRow}>
            <FontAwesome6 name="triangle-exclamation" size={12} color="#d97706" />
            <ThemedText type="smallBold">Concerns</ThemedText>
          </View>
          {jdMatch.concerns.map((c, i) => (
            <ThemedText key={i} type="small" themeColor="textSecondary">
              • {c}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

function SkillChipGroup({
  title,
  icon,
  color,
  skills,
}: {
  title: string;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  color: string;
  skills?: string[];
}) {
  const theme = useTheme();
  return (
    <View style={styles.insightSection}>
      <View style={styles.statusRow}>
        <FontAwesome6 name={icon} size={12} color={color} />
        <ThemedText type="smallBold">{title}</ThemedText>
      </View>
      {skills && skills.length > 0 ? (
        <View style={styles.chipRow}>
          {skills.map((s) => (
            <View key={s} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{s}</ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          None identified.
        </ThemedText>
      )}
    </View>
  );
}

function TargetedQuestionsCard({ questions }: { questions?: DetailedAnalysisTargetedQuestion[] | null }) {
  const theme = useTheme();
  if (!questions || questions.length === 0) return null;
  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="subtitle">Suggested Follow-Up Questions</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Targeted at this candidate&apos;s identified weak areas.
      </ThemedText>
      {questions.map((q, i) => (
        <View key={i} style={[styles.resultRow, { borderColor: theme.border }]}>
          <View style={[styles.difficultyBadge, { backgroundColor: `${DIFFICULTY_COLOR[q.difficulty] ?? theme.primary}22` }]}>
            <ThemedText type="small" style={{ color: DIFFICULTY_COLOR[q.difficulty] ?? theme.primary, fontWeight: '600' }}>
              {q.difficulty}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="small">{q.question}</ThemedText>
            {q.category ? (
              <ThemedText type="small" themeColor="textSecondary">
                {q.category}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  loader: { marginTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10 },
  statTile: { borderRadius: Radius.md, padding: 10, gap: 2 },
  insightSection: { gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  difficultyBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
});
