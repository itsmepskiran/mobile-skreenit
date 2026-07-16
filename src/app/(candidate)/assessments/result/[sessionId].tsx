import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAssessmentResult } from '@/lib/api/assessment-taking';

// Matches sql-skreenit's assessment-result.js: poll every 15s, up to 10 times
// (150s total), while AI analysis runs as a background job server-side.
const POLL_INTERVAL_MS = 15000;
const MAX_POLLS = 10;

export default function AssessmentResultScreen() {
  const theme = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [pollCount, setPollCount] = useState(0);

  const resultQuery = useQuery({
    queryKey: ['assessment-result', sessionId],
    queryFn: () => getAssessmentResult(sessionId),
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      if (!data || data.analysis_status !== 'pending') return false;
      if (pollCount >= MAX_POLLS) return false;
      setPollCount((count: number) => count + 1);
      return POLL_INTERVAL_MS;
    },
  });

  const data = resultQuery.data?.data;
  const feedback = data?.ai_feedback;

  if (resultQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <ThemedText themeColor="textSecondary">Could not load this result.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (data.analysis_status === 'pending' && pollCount < MAX_POLLS) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="subtitle" style={styles.centerText}>
            Analyzing your responses...
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
            This usually takes under a minute. Feel free to check back later.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{data.assessment_name}</ThemedText>

        {data.analysis_status === 'failed' || (data.analysis_status === 'pending' && pollCount >= MAX_POLLS) ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">AI feedback unavailable</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your submission was saved, but we couldn&apos;t generate AI feedback for it this time. Your responses
              are still recorded and visible to recruiters.
            </ThemedText>
          </ThemedView>
        ) : null}

        {feedback?.overall_score != null ? (
          <ThemedView style={[styles.scoreCard, { borderColor: theme.border }]}>
            <View style={[styles.scoreCircle, { borderColor: theme.primary }]}>
              <ThemedText type="title" themeColor="primary">
                {feedback.overall_grade ?? Math.round(feedback.overall_score)}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{feedback.overall_score}/100</ThemedText>
              {feedback.grade_label ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback.grade_label}
                </ThemedText>
              ) : null}
            </View>
          </ThemedView>
        ) : null}

        {data.mcq_total ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">MCQ Score</ThemedText>
            <ThemedText themeColor="primary">
              {data.mcq_score ?? 0} / {data.mcq_total}
            </ThemedText>
          </ThemedView>
        ) : null}

        {feedback?.summary ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Summary</ThemedText>
            <ThemedText themeColor="textSecondary">{feedback.summary}</ThemedText>
          </ThemedView>
        ) : null}

        {feedback?.trait_profile && Object.keys(feedback.trait_profile).length > 0 ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Trait Profile</ThemedText>
            {Object.entries(feedback.trait_profile).map(([trait, score]) => (
              <View key={trait} style={styles.traitRow}>
                <ThemedText type="small" style={styles.traitLabel}>
                  {trait}
                </ThemedText>
                <View style={[styles.traitBarTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.traitBarFill, { backgroundColor: theme.primary, width: `${Math.min(100, Number(score))}%` }]} />
                </View>
              </View>
            ))}
            {feedback.work_style ? (
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>
                {feedback.work_style}
              </ThemedText>
            ) : null}
          </ThemedView>
        ) : null}

        {feedback?.strengths?.length ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Strengths</ThemedText>
            {feedback.strengths.map((s, i) => (
              <View key={i} style={styles.listRow}>
                <FontAwesome6 name="check" size={12} color={theme.secondary} />
                <ThemedText type="small" style={{ flex: 1 }}>
                  {s}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        ) : null}

        {feedback?.areas_for_improvement?.length ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Areas for Improvement</ThemedText>
            {feedback.areas_for_improvement.map((s, i) => (
              <View key={i} style={styles.listRow}>
                <FontAwesome6 name="arrow-up" size={12} color={theme.primary} />
                <ThemedText type="small" style={{ flex: 1 }}>
                  {s}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        ) : null}

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {data.total_exercises} exercises · {data.time_taken_seconds ? `${Math.round(data.time_taken_seconds / 60)} min` : '—'}
          </ThemedText>
        </View>

        {data.is_free ? (
          <Button
            title="Re-Take Assessment"
            variant="secondary"
            onPress={() => router.replace(`/(candidate)/assessments/take/${data.assessment_key}`)}
          />
        ) : null}
        <Button title="Back to Assessments" onPress={() => router.replace('/(candidate)/assessments')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 60 },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  centerText: { textAlign: 'center' },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderRadius: Radius.lg, padding: 16 },
  scoreCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  traitRow: { gap: 4 },
  traitLabel: { textTransform: 'capitalize' },
  traitBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  traitBarFill: { height: 6, borderRadius: 3 },
  metaRow: { alignItems: 'center', marginTop: 4 },
});
