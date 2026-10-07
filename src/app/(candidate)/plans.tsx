import { FontAwesome6 } from '@/components/scoped';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GradientScreen } from '@/components/on-gradient';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { usePlanCheckout } from '@/hooks/use-plan-checkout';
import { useTheme } from '@/hooks/use-theme';
import { getCandidateCreditsSummary } from '@/lib/api/candidate-credits';
import { getMockQuote } from '@/lib/api/interview';
import { listPricingPlans, type PricingPlan } from '@/lib/api/subscription';

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

function cycleLabel(plan: PricingPlan): string {
  const bc = (plan.billing_cycle ?? '').toLowerCase();
  if (/half/.test(bc)) return '6 months';
  if (/quarter/.test(bc)) return '3 months';
  if (/year|annual/.test(bc)) return 'year';
  if (/month/.test(bc)) return 'month';
  return 'plan';
}

// One place to compare everything a candidate can buy: Career Pass (resume writing, reports,
// video analysis) and the four Mock Interview plans. Prices, caps and lengths come from the
// pricing table.
const PLAN_COLORS: Record<string, readonly [string, string]> = {
  interview_plan_free: ['#64748b', '#94a3b8'],
  interview_plan_pro: ['#0ea5e9', '#2563eb'],
  interview_plan_popular: ['#f59e0b', '#ef4444'],
  interview_plan_unlimited: ['#8b5cf6', '#ec4899'],
};

export default function PlansScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const checkout = usePlanCheckout(() => {
    queryClient.invalidateQueries({ queryKey: ['candidate'] });
  });

  const plansQuery = useQuery({ queryKey: ['subscription', 'plans', 'candidate_addon'], queryFn: () => listPricingPlans('candidate_addon') });
  const summaryQuery = useQuery({ queryKey: ['candidate', 'credits-summary'], queryFn: getCandidateCreditsSummary });
  const quoteQuery = useQuery({ queryKey: ['candidate', 'mock-quote'], queryFn: getMockQuote });
  const passActive = summaryQuery.data?.data.career_pass.active;
  const quote = quoteQuery.data?.data;

  const { pass, interviewPlans } = useMemo(() => {
    const all = plansQuery.data?.data ?? [];
    return {
      pass: all.find((p) => p.service_key === 'career_pass'),
      interviewPlans: all
        .filter((p) => p.service_key.startsWith('interview_plan_'))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    };
  }, [plansQuery.data]);

  return (
    <GradientScreen>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Plans" subtitle="Career Pass and mock interview plans" icon="gem" backTo="/(candidate)/premium-services" colors={['#10b981', '#4f46e5']} />
      {plansQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            All prices include GST. Pay with coins as you go, or choose a plan.
          </ThemedText>

          {pass ? (
            <ThemedView style={[styles.card, { borderColor: passActive ? '#16a34a' : '#4338ca' }]}>
              <LinearGradient colors={passActive ? ['#16a34a', '#10b981'] : ['#f59e0b', '#f97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.band}>
                <FontAwesome6 name="id-badge" size={15} color="#fff" />
                <ThemedText type="smallBold" style={{ flex: 1, color: '#fff' }}>Career Pass</ThemedText>
                {passActive ? <ThemedText type="small" style={styles.bandTag}>Active</ThemedText> : null}
              </LinearGradient>
              <ThemedText type="subtitle" style={{ color: '#4338ca' }}>
                {inr(pass.price_inr)}
                <ThemedText type="small" themeColor="textSecondary">{` / ${cycleLabel(pass)}`}</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✓ Unlimited AI Resume Writing</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✓ Unlimited Employability Reports</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✓ Unlimited Intro Video Analysis</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Mock interviews have their own plans below.</ThemedText>
              {!passActive ? (
                <Button title="Get Career Pass" loading={checkout.pendingPlanId === pass.id} onPress={() => checkout.buy(pass)} />
              ) : null}
            </ThemedView>
          ) : null}

          <ThemedText type="subtitle" style={{ marginTop: 4 }}>Mock Interview plans</ThemedText>
          {interviewPlans.map((p) => {
            const free = Number(p.price_inr) === 0;
            const current = !!quote && quote.source !== 'coins' && quote.plan_name === p.name;
            const featured = p.service_key === 'interview_plan_popular';
            return (
              <ThemedView key={p.id} style={[styles.card, { borderColor: current ? '#4338ca' : featured ? '#f59e0b' : theme.border }]}>
                <LinearGradient colors={PLAN_COLORS[p.service_key] ?? ['#64748b', '#94a3b8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.band}>
                  <ThemedText type="smallBold" style={{ flex: 1, color: '#fff' }}>{p.name}</ThemedText>
                  {current ? <ThemedText type="small" style={styles.bandTag}>Your plan</ThemedText> : null}
                  {!current && featured ? <ThemedText type="small" style={styles.bandTag}>Most popular</ThemedText> : null}
                </LinearGradient>
                <ThemedText type="subtitle" style={{ color: (PLAN_COLORS[p.service_key] ?? ['#334155'])[0] }}>
                  {free ? '₹0' : inr(p.price_inr)}
                  {!free ? <ThemedText type="small" themeColor="textSecondary">{` / ${cycleLabel(p)}`}</ThemedText> : null}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ✓ {p.interview_limit == null ? `Unlimited interviews${p.interview_daily_limit ? ` (up to ${p.interview_daily_limit} a day)` : ''}` : `${p.interview_limit} interviews${free ? ' (one-time)' : ''}`}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">✓ Up to {p.interview_max_minutes} min each</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">✓ AI feedback &amp; Detailed Report</ThemedText>
                {!free ? (
                  <Button
                    title={current ? 'Renew / extend' : 'Choose plan'}
                    variant="secondary"
                    loading={checkout.pendingPlanId === p.id}
                    onPress={() => checkout.buy(p)}
                  />
                ) : null}
              </ThemedView>
            );
          })}
          {checkout.error ? <ThemedText type="small" style={{ color: theme.danger }}>{checkout.error}</ThemedText> : null}
        </ScrollView>
      )}
      {checkout.checkoutElement}
    </SafeAreaView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1.5, borderRadius: Radius.lg, padding: 16, gap: 6, overflow: 'hidden' },
  band: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: -16, marginTop: -16, marginBottom: 6, paddingHorizontal: 16, paddingVertical: 10 },
  bandTag: { color: '#fff', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
