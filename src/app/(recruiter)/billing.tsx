import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCoinSummary } from '@/lib/api/credits';
import { getPurchaseHistory, listPricingPlans } from '@/lib/api/subscription';

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

// Next monthly anniversary of a subscription's start, i.e. when the plan's next coin grant lands.
function nextGrant(start: string, now: number): Date {
  const s = new Date(start);
  const d = new Date(s);
  let n = 0;
  while (d.getTime() <= now && n < 36) {
    n += 1;
    d.setTime(s.getTime());
    d.setMonth(s.getMonth() + n);
  }
  return d;
}

// Recruiter billing: the active plan and when it ends, the monthly coins it credits and the next
// grant date, coin balance, and the history of plan grants. Works for Recruiter Pro (monthly or
// yearly); company plans are managed by staff and shown on the Company Quota screen.
export default function RecruiterBillingScreen() {
  const theme = useTheme();
  const [now] = useState(() => Date.now());
  const historyQuery = useQuery({ queryKey: ['subscription', 'history'], queryFn: getPurchaseHistory });
  const coinsQuery = useQuery({ queryKey: ['recruiter', 'coin-summary'], queryFn: getCoinSummary });
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans', 'recruiter_plan'], queryFn: () => listPricingPlans('recruiter_plan') });

  const active = useMemo(
    () =>
      (historyQuery.data?.data ?? []).filter(
        (h) =>
          h.service_type === 'recruiter_plan' &&
          ['active', 'trial'].includes(h.status) &&
          (!h.expiry_date || new Date(h.expiry_date).getTime() > now) &&
          ['recruiter_pro', 'recruiter_pro_yearly', 'candidate_db_access'].includes(h.service_key ?? ''),
      ),
    [historyQuery.data, now],
  );
  const coins = coinsQuery.data?.data;
  const monthlyCoins = (key: string | null) =>
    (plansQuery.data?.data ?? []).find((p) => p.service_key === key)?.monthly_coins ?? null;
  const grants = (coins?.recent_transactions ?? []).filter((t) => t.event_type === 'recruiter_pro_grant');
  const loading = historyQuery.isLoading || coinsQuery.isLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Billing & Plan" subtitle="Your plan and monthly coins" icon="receipt" backTo="/(recruiter)/ats-services" colors={['#10b981', '#4f46e5']} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={[styles.card, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <View style={styles.row}>
              <FontAwesome6 name="coins" size={16} color="#d97706" />
              <ThemedText type="smallBold" style={{ color: '#92400e' }}>Coin balance</ThemedText>
            </View>
            <ThemedText type="title" style={{ color: '#78350f' }}>{coins?.balance ?? 0}</ThemedText>
            {coins?.welcome_expiring ? (
              <ThemedText type="small" style={{ color: '#b45309' }}>
                {coins.welcome_expiring.coins} welcome coins expire on {fmt(coins.welcome_expiring.expires_at)}
              </ThemedText>
            ) : null}
            <Button title="Top up coins" icon="plus" onPress={() => router.push('/(recruiter)/credits')} />
          </ThemedView>

          <ThemedText type="subtitle">Your plan</ThemedText>
          {active.length ? (
            active.map((h) => {
              const mc = monthlyCoins(h.service_key);
              return (
                <ThemedView key={h.subscription_id} style={[styles.card, { borderColor: theme.border }]}>
                  <View style={styles.row}>
                    <ThemedText type="smallBold" style={{ flex: 1 }}>{h.plan_name}</ThemedText>
                    <ThemedText type="small" style={{ color: '#16a34a', fontWeight: '700' }}>Active</ThemedText>
                  </View>
                  <Line label="Started" value={fmt(h.start_date)} />
                  <Line label={h.billing_cycle === 'yearly' ? 'Valid until' : 'Renews / ends'} value={fmt(h.expiry_date)} />
                  {mc && h.start_date ? (
                    <>
                      <Line label="Coins every month" value={`${mc} coins`} />
                      <Line label="Next coin credit" value={fmt(nextGrant(h.start_date, now).toISOString())} />
                    </>
                  ) : null}
                </ThemedView>
              );
            })
          ) : (
            <ThemedView style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                You&apos;re on Pay As You Go. Recruiter Pro credits coins every month, with a yearly option that saves about 2 months.
              </ThemedText>
              <Button title="See plans" variant="secondary" icon="crown" onPress={() => router.push('/(recruiter)/premium')} />
            </ThemedView>
          )}

          {grants.length ? (
            <>
              <ThemedText type="subtitle">Monthly coin credits</ThemedText>
              {grants.map((g, i) => (
                <View key={i} style={[styles.grantRow, { borderColor: theme.border }]}>
                  <ThemedText type="small">{fmt(g.created_at)}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: '#16a34a' }}>+{g.amount_coins} coins</ThemedText>
                </View>
              ))}
            </>
          ) : null}

          <Button title="Purchase history" variant="secondary" icon="receipt" onPress={() => router.push('/(recruiter)/purchase-history')} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  grantRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
});
