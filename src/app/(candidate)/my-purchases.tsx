import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CareerPassModal } from '@/components/career-pass-modal';
import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useOrderReview } from '@/hooks/use-order-review';
import { useTheme } from '@/hooks/use-theme';
import { getCandidateCreditsSummary, type CandidateCoinTransaction, type CandidateServiceUsage } from '@/lib/api/candidate-credits';
import { ApiError } from '@/lib/api/client';
import { describeRate, getCandidateRates } from '@/lib/api/service-rates';
import { CANDIDATE_COIN_PACKS, confirmCreditPurchase, createCreditOrder } from '@/lib/api/credits';
import {
  confirmSubscription,
  createSubscription,
  getPaymentConfig,
  listPricingPlans,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

const EVENT_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  welcome_grant: 'Welcome Offer',
  expiry: 'Welcome Coins Expired',
  consume: 'Used',
};

const SERVICE_LABELS: Record<string, string> = {
  resume_writing: 'AI Resume Writing',
  employability_report: 'Employability Report',
  video_analysis: 'Intro Video Analysis',
  mock_interview: 'Mock Interview Practice',
};

// Rows of the "How coins are charged" list; prices come from /subscription/coins/rates.
const RATE_ROWS: { key: 'resume_writing' | 'employability_report' | 'video_analysis' | 'mock_interview'; icon: React.ComponentProps<typeof FontAwesome6>['name']; title: string; unit: string }[] = [
  { key: 'resume_writing', icon: 'pen-nib', title: 'AI Resume Writing', unit: 'Per rewrite' },
  { key: 'employability_report', icon: 'file-contract', title: 'Employability Report', unit: 'Per report' },
  { key: 'video_analysis', icon: 'brain', title: 'Intro Video Analysis', unit: 'Per analysis' },
  { key: 'mock_interview', icon: 'video', title: 'Mock Interview Practice', unit: 'Per interview, report included' },
];

// "3 uses · 20 coins spent · 1 credit used" — empty string when the service hasn't been used.
function usageSummary(usage?: CandidateServiceUsage): string {
  if (!usage || !usage.uses) return '';
  const parts = [`${usage.uses} ${usage.uses === 1 ? 'use' : 'uses'}`];
  if (usage.coins_spent) parts.push(`${usage.coins_spent} coins spent`);
  if (usage.credits_used) parts.push(`${usage.credits_used} ${usage.credits_used === 1 ? 'credit' : 'credits'} used`);
  return parts.join(' \u00b7 ');
}

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
  const { reviewOrder, reviewElement, showReceipt } = useOrderReview();
  const authUser = useAuthStore((state) => state.user);
  const [showPacks, setShowPacks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [passModalOpen, setPassModalOpen] = useState(false);

  const summaryQuery = useQuery({ queryKey: ['candidate', 'credits-summary'], queryFn: getCandidateCreditsSummary });
  const summary = summaryQuery.data?.data;
  const ratesQuery = useQuery({ queryKey: ['subscription', 'candidate-rates'], queryFn: getCandidateRates });
  const rates = ratesQuery.data?.data;
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans', 'candidate_addon'], queryFn: () => listPricingPlans('candidate_addon') });
  const passPlan = plansQuery.data?.data.find((p) => p.service_key === 'career_pass');
  const passPrice = passPlan
    ? `₹${passPlan.price_inr}${/year|annual/i.test(passPlan.billing_cycle ?? '') ? ' / year' : /month/i.test(passPlan.billing_cycle ?? '') ? ' / month' : ''}`
    : '';

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['candidate', 'credits-summary'] });

  const startCareerPassMutation = useMutation({
    mutationFn: async () => {
      const plans = await listPricingPlans('candidate_addon');
      const plan = plans.data.find((p) => p.service_key === 'career_pass');
      if (!plan) throw new Error('Career Pass is not available right now.');
      const sub = await createSubscription(plan.id);
      // The Career Pass explainer closes first so the review sheet isn't stacked on top of it.
      setPassModalOpen(false);
      const reviewed = await reviewOrder({
        subscriptionId: sub.data.subscription_id,
        name: plan.name,
        priceInr: plan.price_inr,
        serviceType: plan.service_type,
      });
      if (!reviewed) return null;
      return {
        keyId: reviewed.keyId,
        orderId: reviewed.orderId,
        amount: reviewed.amount,
        currency: reviewed.currency,
        name: reviewed.name,
        kind: 'subscription' as const,
        subscriptionId: reviewed.subscriptionId,
      };
    },
    onSuccess: (order) => {
      setPassModalOpen(false);
      if (order) setCheckoutOrder(order);
    },
    onError: (err) => {
      setPassModalOpen(false);
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
    },
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
    onSuccess: (_data, success) => {
      const wasSubscription = checkoutOrder?.kind === 'subscription';
      setCheckoutOrder(null);
      if (wasSubscription) showReceipt(success, 'confirmed');
      invalidate();
    },
    onError: (_err, success) => {
      const wasSubscription = checkoutOrder?.kind === 'subscription';
      setCheckoutOrder(null);
      if (wasSubscription) showReceipt(success, 'unconfirmed');
      else setError('Payment succeeded but confirmation failed. Contact support.');
      invalidate();
    },
  });

  const careerPass = summary?.career_pass;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(candidate)/profile')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">My Purchases</ThemedText>
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
                  ? `Resume writing, reports & video analysis unlimited until ${formatDate(careerPass.expiry_date)}`
                  : 'Resume writing, reports & video analysis, unlimited'
                : `Unlimited resume writing, reports & video analysis${passPrice ? ` · ${passPrice}` : ''}`}
            </ThemedText>
            {!careerPass?.active ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.primary, alignSelf: 'flex-start' }]}
                onPress={() => setPassModalOpen(true)}
              >
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  Get Career Pass
                </ThemedText>
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
              {summary?.coin_balance ?? 0} coins &middot; see the rates below
            </ThemedText>
            {summary?.welcome_expiring ? (
              <ThemedText type="small" style={{ color: '#b45309' }}>
                {summary.welcome_expiring.coins} free welcome coins expire on {formatDate(summary.welcome_expiring.expires_at)}
              </ThemedText>
            ) : null}
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
            How Coins Are Charged
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Coins are only spent when you use a service below. Career Pass covers resume writing, reports and video analysis; mock
            interviews are included in their own plans.
          </ThemedText>
          {RATE_ROWS.map((row) => {
            const used = usageSummary(summary?.usage?.[row.key]);
            return (
              <ThemedView key={row.key} style={[styles.card, { borderColor: theme.border }]}>
                <View style={{ gap: 4 }}>
                  <View style={styles.cardTitleRow}>
                    <FontAwesome6 name={row.icon} size={14} color={theme.primary} />
                    <ThemedText type="smallBold">{row.title}</ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: '#b45309' }}>
                    {describeRate(rates?.[row.key]) || '–'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {row.unit} · {used ? `Used: ${used}` : 'Not used yet'}
                  </ThemedText>
                </View>
              </ThemedView>
            );
          })}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>
          {!summary?.recent_transactions.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              No activity yet.
            </ThemedText>
          ) : (
            summary.recent_transactions.map((tx, i) => <TransactionRow key={i} tx={tx} />)
          )}
        </ScrollView>
      )}

      <CareerPassModal
        visible={passModalOpen}
        priceLabel={passPrice}
        loading={startCareerPassMutation.isPending}
        onContinue={() => startCareerPassMutation.mutate()}
        onClose={() => setPassModalOpen(false)}
      />

      {reviewElement}

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

function TransactionRow({ tx }: { tx: CandidateCoinTransaction }) {
  const theme = useTheme();
  const eventLabel = EVENT_LABELS[tx.event_type] ?? tx.event_type;
  const isUse = tx.event_type === 'consume';
  // A use is attributed to the service it paid for; everything else keeps its feature label.
  const subject = isUse && tx.reference_type
    ? SERVICE_LABELS[tx.reference_type] ?? tx.reference_type
    : tx.feature_key === 'candidate_coins' ? 'Coins' : tx.feature_key;
  const paidWith = isUse
    ? tx.feature_key === 'candidate_coins'
      ? tx.amount_coins === 0 ? ' (free)' : ` (${Math.abs(tx.amount_coins)} coins)`
      : ' (1 credit)'
    : '';
  return (
    <View style={[styles.historyRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement, borderRadius: 12, borderTopWidth: 0, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 }]}>
      <View style={styles.historyMain}>
        <FontAwesome6 name={isUse ? 'receipt' : tx.event_type === 'welcome_grant' ? 'gift' : tx.event_type === 'expiry' ? 'hourglass-end' : 'cart-shopping'} size={14} color={tx.event_type === 'expiry' || isUse ? '#c53030' : '#2f855a'} />
        <View>
          <ThemedText type="small">
            {subject} — {eventLabel}{paidWith}
            {tx.amount_inr ? ` — ₹${tx.amount_inr}` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(tx.created_at)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="smallBold" style={{ color: tx.amount_coins < 0 ? '#c53030' : '#2f855a' }}>
        {tx.event_type === 'consume' && tx.amount_coins === 0 ? 'Free' : `${tx.amount_coins < 0 ? '' : '+'}${tx.amount_coins}`}
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
