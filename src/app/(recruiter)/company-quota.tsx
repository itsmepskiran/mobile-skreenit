import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCompanyQuotaStatus, type CompanyQuota } from '@/lib/api/recruiter';

// Mirrors sql-skreenit's recruiter/js/company-quota.js FEATURE_LABELS.
const FEATURE_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof FontAwesome6>['name'] }> = {
  job_postings: { label: 'Job Posts', icon: 'briefcase' },
  assessment_invite: { label: 'Assessment Invites', icon: 'clipboard-check' },
  detailed_analysis: { label: 'Detailed Analyses', icon: 'magnifying-glass-chart' },
  ai_interview_analysis: { label: 'AI Interview Analyses', icon: 'video' },
};

export default function CompanyQuotaScreen() {
  const theme = useTheme();
  const quotaQuery = useQuery({ queryKey: ['recruiter', 'company-quota'], queryFn: getCompanyQuotaStatus });
  const data = quotaQuery.data?.data;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/profile')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Company Quota</ThemedText>
      </View>

      {quotaQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : quotaQuery.isError || !data ? (
        <View style={styles.emptyBox}>
          <FontAwesome6 name="circle-info" size={20} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            You are not part of a company recruitment plan.
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {data.plan_name ? (
            <ThemedText type="small" themeColor="textSecondary">
              {data.plan_name} plan{data.seat_count != null ? ` — ${data.seat_count} extra seats` : ''}
            </ThemedText>
          ) : null}

          {Object.entries(data.quotas).map(([featureKey, quota]) => (
            <QuotaCard key={featureKey} featureKey={featureKey} quota={quota} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function QuotaCard({ featureKey, quota }: { featureKey: string; quota: CompanyQuota }) {
  const theme = useTheme();
  const meta = FEATURE_LABELS[featureKey] ?? { label: featureKey, icon: 'circle' as const };
  const pool = quota.pool || 0;
  const remaining = quota.remaining || 0;
  const used = Math.max(0, pool - remaining);
  const pct = pool > 0 ? Math.min(100, Math.round((used / pool) * 100)) : 0;

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardTitleRow}>
        <FontAwesome6 name={meta.icon} size={13} color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary">
          {meta.label}
        </ThemedText>
      </View>
      <View style={styles.figuresRow}>
        <ThemedText type="title">{remaining}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {' '}
          / {pool} remaining this quarter
        </ThemedText>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: theme.primary }]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {used} used of {pool} quarterly pool
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  figuresRow: { flexDirection: 'row', alignItems: 'baseline' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});
