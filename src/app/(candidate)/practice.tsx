import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listIntroSessions, listMockSessions, type SessionSummary } from '@/lib/api/interview';

type Entry = SessionSummary & { kind: 'mock' | 'intro' };

// Practice hub: every mock interview and intro video analysis in one timeline, with a score
// trend so improvement is visible. Tap a row to reopen its feedback cards and report.
export default function PracticeScreen() {
  const theme = useTheme();
  const mockQuery = useQuery({ queryKey: ['candidate', 'mock-sessions'], queryFn: listMockSessions });
  const introQuery = useQuery({ queryKey: ['candidate', 'intro-sessions'], queryFn: listIntroSessions });

  const entries: Entry[] = useMemo(() => {
    const mock = (mockQuery.data?.data ?? []).map((s) => ({ ...s, kind: 'mock' as const }));
    const intro = (introQuery.data?.data ?? []).map((s) => ({ ...s, kind: 'intro' as const }));
    return [...mock, ...intro].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [mockQuery.data, introQuery.data]);

  const scored = entries.filter((e) => e.overall_score != null).slice(0, 8).reverse(); // oldest -> newest
  const avg = scored.length ? Math.round(scored.reduce((n, e) => n + (e.overall_score ?? 0), 0) / scored.length) : null;
  const best = scored.length ? Math.max(...scored.map((e) => e.overall_score ?? 0)) : null;
  const trend =
    scored.length >= 2 ? (scored[scored.length - 1].overall_score ?? 0) - (scored[0].overall_score ?? 0) : null;
  const loading = mockQuery.isLoading || introQuery.isLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Practice" subtitle="Your mock interviews and intro analyses" icon="dumbbell" backTo="/(candidate)/premium-services" colors={['#06b6d4', '#6366f1']} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.actions}>
            <Button title="Mock interview" icon="video" onPress={() => router.push('/(candidate)/mock-interview')} style={{ flex: 1 }} />
            <Button title="Intro analysis" icon="brain" variant="secondary" onPress={() => router.push('/(candidate)/intro-video-analysis')} style={{ flex: 1 }} />
          </View>

          {scored.length ? (
            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.statsRow}>
                <Stat label="Sessions" value={String(entries.length)} />
                <Stat label="Average" value={avg != null ? String(avg) : '–'} />
                <Stat label="Best" value={best != null ? String(best) : '–'} />
                <Stat
                  label="Trend"
                  value={trend == null ? '–' : `${trend >= 0 ? '+' : ''}${trend}`}
                  color={trend == null ? undefined : trend >= 0 ? '#16a34a' : '#dc2626'}
                />
              </View>
              <View style={styles.bars}>
                {scored.map((e) => (
                  <View key={e.id} style={styles.barCol}>
                    <ThemedText type="small" themeColor="textSecondary">{e.overall_score}</ThemedText>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: `${Math.max(6, e.overall_score ?? 0)}%`, backgroundColor: e.kind === 'mock' ? '#6366f1' : '#10b981' }]} />
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.legend}>
                <Legend color="#6366f1" label="Mock interview" />
                <Legend color="#10b981" label="Intro analysis" />
              </View>
            </ThemedView>
          ) : null}

          <ThemedText type="subtitle">History</ThemedText>
          {!entries.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing yet. Start a mock interview or an intro video analysis — your feedback and scores will collect here.
            </ThemedText>
          ) : (
            entries.map((e) => (
              <Pressable
                key={`${e.kind}-${e.id}`}
                onPress={() =>
                  router.push({
                    pathname: e.kind === 'mock' ? '/(candidate)/mock-interview' : '/(candidate)/intro-video-analysis',
                    params: { session: e.id },
                  } as never)
                }
              >
                <ThemedView style={[styles.rowCard, { borderColor: theme.border }]}>
                  <View style={[styles.kindIcon, { backgroundColor: e.kind === 'mock' ? '#eef2ff' : '#ecfdf5' }]}>
                    <FontAwesome6 name={e.kind === 'mock' ? 'video' : 'brain'} size={14} color={e.kind === 'mock' ? '#4338ca' : '#059669'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {e.kind === 'mock' ? e.target_role : 'Intro video analysis'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} ·{' '}
                      {e.status === 'completed' ? 'Completed' : 'In progress'}
                    </ThemedText>
                  </View>
                  {e.overall_score != null ? (
                    <ThemedText type="subtitle" style={{ color: '#4338ca' }}>{e.overall_score}</ThemedText>
                  ) : (
                    <FontAwesome6 name="chevron-right" size={12} color={theme.textSecondary} />
                  )}
                </ThemedView>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <ThemedText type="subtitle" style={color ? { color } : undefined}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  statsRow: { flexDirection: 'row' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  kindIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
