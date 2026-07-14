import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listMyAssessments } from '@/lib/api/assessments';

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  completed: { label: 'Completed', bg: '#f0fff4', fg: '#2f855a' },
  in_progress: { label: 'In Progress', bg: '#fffaf0', fg: '#c05621' },
  pending: { label: 'Pending', bg: '#ebf8ff', fg: '#2b6cb0' },
};

export default function AssessmentsScreen() {
  const theme = useTheme();

  const assessmentsQuery = useQuery({ queryKey: ['assessments', 'mine'], queryFn: listMyAssessments });
  const assessments = assessmentsQuery.data?.data ?? [];

  if (assessmentsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">My Assessments</ThemedText>

        {assessments.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            You haven&apos;t taken any assessments yet.
          </ThemedText>
        ) : (
          assessments.map((session) => {
            const statusStyle = STATUS_STYLE[session.status] ?? STATUS_STYLE.pending;
            return (
              <ThemedView
                key={session.session_id}
                style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                <ThemedView style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={2}>
                    {session.assessment_name}
                  </ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <ThemedText type="small" style={{ color: statusStyle.fg, fontWeight: '600' }}>
                      {statusStyle.label}
                    </ThemedText>
                  </View>
                </ThemedView>

                <View style={styles.metaRow}>
                  <FontAwesome6 name="layer-group" size={11} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {session.format}
                  </ThemedText>
                  {session.is_free ? (
                    <ThemedText type="small" themeColor="secondary">
                      · Free
                    </ThemedText>
                  ) : null}
                </View>

                {session.mcq_total != null ? (
                  <View style={styles.metaRow}>
                    <FontAwesome6 name="list-check" size={11} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      MCQ score: {session.mcq_score ?? 0}/{session.mcq_total}
                    </ThemedText>
                  </View>
                ) : null}

                {session.overall_score != null ? (
                  <View style={styles.metaRow}>
                    <FontAwesome6 name="chart-simple" size={11} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Overall score: {session.overall_score}
                    </ThemedText>
                  </View>
                ) : null}

                {session.completed_at ? (
                  <View style={styles.metaRow}>
                    <FontAwesome6 name="clock" size={11} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Completed {new Date(session.completed_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ) : null}
              </ThemedView>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
