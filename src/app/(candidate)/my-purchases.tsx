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
import { getCandidateCreditsSummary, type CandidateCoinTransaction } from '@/lib/api/candidate-credits';
import { ApiError } from '@/lib/api/client';
import { CANDIDATE_COIN_PACKS, confirmCreditPurchase, createCreditOrder } from '@/lib/api/credits';
import {
  confirmSubscription,
  createRazorpayOrder,
  createSubscription,
  getPaymentConfig,
  listPricingPlans,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

const EVENT_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  welcome_grant: 'Welcome Offer',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type CheckoutOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  // Distinguishes which confirm endpoint to call on success.
  kind: 'subscription' | 'credit';
  subscriptionId?: string;
  planId?: string;
};

export default function MyPurchasesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const [showPacks, setShowPacks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);

  const summaryQuery = useQuery({ queryKey: ['candidate', 'credits-summary'], queryFn: getCandidateCreditsSummary });
  const summary = summaryQuery.data?.data;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['candidate', 'credits-summary'] });

  const startCareerPassMutation = useMutation({
    mutationFn: async () => {
      const plans = await listPricingPlans('candidate_addon');
      const plan = plans.data.find((p) => p.service_key === 'career_pass');
      if (!plan) throw new Error('Career Pass is not available right now.');
      const sub = await createSubscription(plan.id);
      const [order, config] = await Promise.all([
        createRazorpayOrder({ amount: plan.price_inr, subscriptionId: sub.data.subscription_id, serviceType: plan.service_type }),
        getPaymentConfig(),
      ]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: plan.name,
        kind: 'subscription' as const,
        subscriptionId: sub.data.subscription_id,
      };
    },
    onSuccess: setCheckoutOrder,
    onError: (err) => setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not start checkout. Please try again.'),
  });

  const startCreditMutation = useMutation({
    mutationFn: async (planId: string) => {
      const [order, config] = await Promise.all([createCreditOrder(planId), getPaymentConfig()]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: order.data.plan_name,
        kind: 'credit' as const,
        planId: order.data.plan_id,
      };
    },
    onSuccess: (order) => {
      setShowPacks(false);
      setCheckoutOrder(order);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not start checkout. Please try again.'),
  });

  const confirmMutation = useMutation({
    mutationFn: (success: RazorpaySuccess) => {
      if (!checkoutOrder) throw new Error('No checkout in progress.');
      if (checkoutOrder.kind === 'subscription') {
        return confirmSubscription({
          subscriptionId: checkoutOrder.subscriptionId!,
          paymentMethod: 'razorpay',
          transactionId: success.razorpay_payment_id,
          amountPaid: checkoutOrder.amount / 100,
        });
      }
      return confirmCreditPurchase({
        planId: checkoutOrder.planId!,
        razorpayOrderId: success.razorpay_order_id,
        razorpayPaymentId: success.razorpay_payment_id,
        razorpaySignature: success.razorpay_signature,
      });
    },
    onSuccess: () => {
      setCheckoutOrder(null);
      invalidate();
    },
    onError: () => {
      setCheckoutOrder(null);
      setError('Payment succeeded but confirmation failed. Contact support.');
    },
  });

  const careerPass = summary?.career_pass;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(candidate)/profile')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">My Purchases</ThemedText>
      </View>

      {summaryQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView
            style={[
              styles.card,
              careerPass?.active
                ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
                : { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' },
            ]}
          >
            <View style={styles.cardTitleRow}>
              <FontAwesome6 name="id-badge" size={16} color={careerPass?.active ? '#16a34a' : '#4338ca'} />
              <ThemedText type="subtitle" style={{ color: careerPass?.active ? '#166534' : '#3730a3' }}>
                {careerPass?.active ? 'Career Pass — Active' : 'Career Pass — Not Active'}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: careerPass?.active ? '#15803d' : '#4f46e5' }}>
              {careerPass?.active
                ? careerPass.expiry_date
                  ? `Unlimited AI Resume Writing & Employability Reports until ${formatDate(careerPass.expiry_date)}`
                  : 'Unlimited AI Resume Writing & Employability Reports'
                : '₹399/year for unlimited AI Resume Writing rewrites and Employability Reports'}
            </ThemedText>
            {!careerPass?.active ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.primary, alignSelf: 'flex-start' }]}
                onPress={() => startCareerPassMutation.mutate()}
                disabled={startCareerPassMutation.isPending}
              >
                {startCareerPassMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                    Get Career Pass
                  </ThemedText>
                )}
              </Pressable>
            ) : null}
          </ThemedView>

          <ThemedView style={[styles.card, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <View style={styles.cardTitleRow}>
              <FontAwesome6 name="coins" size={16} color="#d97706" />
              <ThemedText type="subtitle" style={{ color: '#92400e' }}>
                Coin Balance
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: '#a16207' }}>
              {summary?.coin_balance ?? 0} coins &middot; 1 coin = ₹5 &middot; 10 coins = 1 use of either service below
            </ThemedText>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary, alignSelf: 'flex-start' }]}
              onPress={() => setShowPacks((v) => !v)}
            >
              <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                Top Up Coins
              </ThemedText>
            </Pressable>

            {showPacks ? (
              <View style={styles.packGrid}>
                {CANDIDATE_COIN_PACKS.map((pack) => (
                  <Pressable
                    key={pack.planId}
                    style={[styles.packCard, { borderColor: theme.border }]}
                    onPress={() => startCreditMutation.mutate(pack.planId)}
                    disabled={startCreditMutation.isPending}
                  >
                    <ThemedText type="smallBold">
                      <FontAwesome6 name="coins" size={12} color="#f59e0b" /> {pack.coins}
                    </ThemedText>
                    <ThemedText type="small">₹{pack.priceInr}</ThemedText>
                  </Pressable>
                ))}
                {startCreditMutation.isPending ? <ActivityIndicator color={theme.primary} /> : null}
              </View>
            ) : null}
          </ThemedView>

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Credit Balances
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Each report/rewrite is ₹49 per use (or 10 coins from your balance above) unless you hold Career Pass.
          </ThemedText>

          <CreditCard
            icon="pen-nib"
            title="AI Resume Writing"
            balance={summary?.resume_writing_credits ?? 0}
            onBuy={() => startCreditMutation.mutate('ai_resume_writing_repeat')}
            loading={startCreditMutation.isPending}
          />
          <CreditCard
            icon="file-contract"
            title="Employability Report"
            balance={summary?.employability_report_credits ?? 0}
            onBuy={() => startCreditMutation.mutate('employability_report')}
            loading={startCreditMutation.isPending}
          />

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>
          {!summary?.recent_transactions.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              No purchases yet.
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
          description={checkoutOrder.name}
          prefill={{ name: authUser?.full_name ?? '', email: authUser?.email ?? '' }}
          onSuccess={(success) => confirmMutation.mutate(success)}
          onDismiss={() => setCheckoutOrder(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function CreditCard({
  icon,
  title,
  balance,
  onBuy,
  loading,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  balance: number;
  onBuy: () => void;
  loading: boolean;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.creditRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <FontAwesome6 name={icon} size={14} color={theme.primary} />
            <ThemedText type="smallBold">{title}</ThemedText>
          </View>
          <ThemedText type="title">{balance}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            unused credits
          </ThemedText>
        </View>
        <Pressable
          style={[styles.actionButton, { borderColor: theme.primary, borderWidth: 1 }]}
          onPress={onBuy}
          disabled={loading}
        >
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
            Buy Credit
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function TransactionRow({ tx }: { tx: CandidateCoinTransaction }) {
  const theme = useTheme();
  const eventLabel = EVENT_LABELS[tx.event_type] ?? tx.event_type;
  return (
    <View style={[styles.historyRow, { borderColor: theme.border }]}>
      <View style={styles.historyMain}>
        <FontAwesome6 name={tx.event_type === 'welcome_grant' ? 'gift' : 'cart-shopping'} size={14} color="#2f855a" />
        <View>
          <ThemedText type="small">
            {tx.feature_key === 'candidate_coins' ? 'Coins' : tx.feature_key} — {eventLabel}
            {tx.amount_inr ? ` — ₹${tx.amount_inr}` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(tx.created_at)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="smallBold" style={{ color: '#2f855a' }}>
        +{tx.amount_coins}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packCard: { flexBasis: '31%', flexGrow: 1, borderWidth: 1, borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 4 },
  sectionTitle: { marginTop: 4 },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
  historyMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
});
