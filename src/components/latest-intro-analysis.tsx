import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { View } from '@/components/scoped';

import { AnalysisCards } from '@/components/analysis-cards';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLatestIntroAnalysis } from '@/lib/api/interview';

// Profile / Dashboard panel: the latest completed Intro Video Analysis report as a row of cards
// (compact = just the scores, used on the Dashboard).
// Read-only here — the analysis itself is run from Premium Services -> Intro Video Analysis.
export function LatestIntroAnalysis({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const query = useQuery({ queryKey: ['candidate', 'intro-latest'], queryFn: getLatestIntroAnalysis });
  const session = query.data?.data;

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="subtitle">Latest Intro Video Analysis</ThemedText>
      {query.isLoading ? null : session ? (
        <AnalysisCards session={session} compact={compact} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          You haven&apos;t analysed your introduction yet. Answer a few questions on video and get feedback on your speaking,
          confidence and content.
        </ThemedText>
      )}
      <View>
        <Button
          title={session ? 'Run a new analysis' : 'Start analysis'}
          variant="secondary"
          icon="brain"
          onPress={() => router.push('/(candidate)/intro-video-analysis')}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
});
