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
import { downloadDetailedAnalysisReport, getDetailedAnalysisStatus } from '@/lib/api/resume-analysis';

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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  loader: { marginTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10 },
});
