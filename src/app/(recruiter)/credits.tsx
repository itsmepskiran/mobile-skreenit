import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { COIN_PACKS, confirmCreditPurchase, createCreditOrder, getCoinSummary, type CoinTransaction } from '@/lib/api/credits';
import { getPaymentConfig } from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

// Mirrors sql-skreenit's recruiter/js/credits.js FEATURE_LABELS — every feature that can spend
// coins, shown even at zero usage so "item-wise" is a complete picture.
const FEATURE_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof FontAwesome6>['name'] }> = {
  assessment_invite: { label: 'Assessment Invites', icon: 'clipboard-check' },
  detailed_analysis: { label: 'Detailed Analysis Reports', icon: 'magnifying-glass-chart' },
  ai_interview_analysis: { label: 'AI Interview Analyses', icon: 'video' },
};

const EVENT_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof FontAwesome6>['name']; kind: 'grant' | 'spend' }> = {
  purchase: { label: 'Coin Pack Purchase', icon: 'cart-shopping', kind: 'grant' },
  recruiter_pro_grant: { label: 'Premium Bonus Grant', icon: 'gift', kind: 'grant' },
  unused_conversion: { label: 'Unused Balance Refunded', icon: 'rotate-left', kind: 'grant' },
  consume: { label: 'Coins Spent', icon: 'minus', kind: 'spend' },
};

const bestValuePlanId = COIN_PACKS.reduce((best, pack) =>
  pack.priceInr / pack.coins < best.priceInr / best.coins ? pack : best,
).planId;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CreditsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const [showPacks, setShowPacks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<{
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    planId: string;
    planName: string;
  } | null>(null);

  const summaryQuery = useQuery({ queryKey: ['recruiter', 'coin-summary'], queryFn: getCoinSummary });
  const summary = summaryQuery.data?.data;

  const startCheckoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const [order, config] = await Promise.all([createCreditOrder(planId), getPaymentConfig()]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        planId: order.data.plan_id,
        planName: order.data.plan_name,
      };
    },
    onSuccess: (order) => {
      setShowPacks(false);
      setCheckoutOrder(order);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not start checkout. Please try again.'),
  });

  const confirmMutation = useMutation({
    mutationFn: (success: RazorpaySuccess) =>
      confirmCreditPurchase({
        planId: checkoutOrder!.planId,
        razorpayOrderId: success.razorpay_order_id,
        razorpayPaymentId: success.razorpay_payment_id,
        razorpaySignature: success.razorpay_signature,
      }),
    onSuccess: () => {
      setCheckoutOrder(null);
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'coin-summary'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Payment succeeded but confirmation failed. Contact support.');
      setCheckoutOrder(null);
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/profile')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Credits</ThemedText>
      </View>

      {summaryQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={[styles.balanceCard, { borderColor: theme.border }]}>
            <FontAwesome6 name="coins" size={22} color="#f59e0b" />
            <ThemedText type="title">{summary?.balance ?? 0}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Coin Balance
            </ThemedText>
            <Pressable
              style={[styles.topUpButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setError(null);
                setShowPacks((v) => !v);
              }}
            >
              <FontAwesome6 name="plus" size={12} color="#fff" />
              <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                Top Up
              </ThemedText>
            </Pressable>
          </ThemedView>

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          {showPacks ? (
            <View style={styles.packGrid}>
              {COIN_PACKS.map((pack) => (
                <Pressable
                  key={pack.planId}
                  style={[styles.packCard, { borderColor: theme.border }]}
                  onPress={() => startCheckoutMutation.mutate(pack.planId)}
                  disabled={startCheckoutMutation.isPending}
                >
                  {pack.planId === bestValuePlanId ? (
                    <View style={[styles.bestValueBadge, { backgroundColor: theme.primary }]}>
                      <ThemedText type="small" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                        BEST VALUE
                      </ThemedText>
                    </View>
                  ) : null}
                  <ThemedText type="subtitle">
                    <FontAwesome6 name="coins" size={14} color="#f59e0b" /> {pack.coins}
                  </ThemedText>
                  <ThemedText type="smallBold">₹{pack.priceInr}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    ≈ ₹{(pack.priceInr / pack.coins).toFixed(2)} / coin
                  </ThemedText>
                </Pressable>
              ))}
              {startCheckoutMutation.isPending ? <ActivityIndicator color={theme.primary} /> : null}
            </View>
          ) : null}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Usage by Feature
          </ThemedText>
          <View style={styles.usageGrid}>
            {Object.entries(FEATURE_LABELS).map(([key, meta]) => {
              const usage = summary?.usage_by_feature.find((u) => u.feature_key === key);
              return (
                <ThemedView key={key} style={[styles.usageCard, { borderColor: theme.border }]}>
                  <View style={styles.usageTitleRow}>
                    <FontAwesome6 name={meta.icon} size={13} color={theme.primary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {meta.label}
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle">{usage?.coins_spent ?? 0} coins</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {usage?.paid_actions_count ?? 0} paid{usage?.free_actions_count ? `, ${usage.free_actions_count} free` : ''}
                  </ThemedText>
                </ThemedView>
              );
            })}
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>
          {!summary?.recent_transactions.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              No coin activity yet.
            </ThemedText>
          ) : (
            summary.recent_transactions.map((tx, i) => <TransactionRow key={i} tx={tx} />)
          )}
        </ScrollView>
      )}

      {checkoutOrder ? (
        <RazorpayCheckout
          visible
          keyId={checkoutOrder.keyId}
          orderId={checkoutOrder.orderId}
          amount={checkoutOrder.amount}
          currency={checkoutOrder.currency}
          name="Skreenit Recruitment Platform"
          description={checkoutOrder.planName}
          prefill={{ name: authUser?.full_name ?? '', email: authUser?.email ?? '' }}
          onSuccess={(success) => confirmMutation.mutate(success)}
          onDismiss={() => setCheckoutOrder(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function TransactionRow({ tx }: { tx: CoinTransaction }) {
  const theme = useTheme();
  const meta = EVENT_LABELS[tx.event_type] ?? { label: tx.event_type, icon: 'circle' as const, kind: 'grant' as const };
  const isSpend = meta.kind === 'spend';
  const amountColor = isSpend ? theme.danger : '#2f855a';
  return (
    <View style={[styles.historyRow, { borderColor: theme.border }]}>
      <View style={styles.historyMain}>
        <FontAwesome6 name={meta.icon} size={14} color={isSpend ? theme.danger : '#2f855a'} />
        <View>
          <ThemedText type="small">
            {meta.label}
            {tx.amount_inr ? ` — ₹${tx.amount_inr}` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(tx.created_at)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="smallBold" style={{ color: amountColor }}>
        {isSpend ? '-' : '+'}
        {Math.abs(tx.amount_coins)} coins
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  balanceCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 20, alignItems: 'center', gap: 4 },
  topUpButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packCard: { flexBasis: '31%', flexGrow: 1, borderWidth: 1, borderRadius: Radius.md, padding: 12, alignItems: 'center', gap: 4 },
  bestValueBadge: { position: 'absolute', top: -8, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sectionTitle: { marginTop: 4 },
  usageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  usageCard: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: Radius.md, padding: 12, gap: 4 },
  usageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
  historyMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
});
