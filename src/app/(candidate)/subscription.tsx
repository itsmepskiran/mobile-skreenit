import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getProfile } from '@/lib/api/applicant';
import { ApiError } from '@/lib/api/client';
import {
    confirmSubscription,
    createRazorpayOrder,
    createSubscription,
    getPaymentConfig,
    listPricingPlans,
    type PricingPlan,
} from '@/lib/api/subscription';
import { CATALOG, INDUSTRIES } from '@/lib/assessment-catalog';
import { useAuthStore } from '@/lib/auth/store';

function parseFeatures(features: PricingPlan['features']): string[] {
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isDuplicateUserPlanError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
  return detail.includes('idx_user_plan_unique') || detail.includes('Duplicate entry');
}

function isStalePendingSubscriptionError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
  return err.status === 404 || detail.includes('Subscription not found');
}

export default function SubscriptionScreen() {
  const theme = useTheme();
  const { serviceType, industryKey, planId } = useLocalSearchParams<{
    serviceType?: string;
    industryKey?: string;
    planId?: string;
  }>();
  const authUser = useAuthStore((state) => state.user);
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<{
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    subscriptionId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedPlanId, setConfirmedPlanId] = useState<string | null>(null);
  const [pendingSubscriptionByPlan, setPendingSubscriptionByPlan] = useState<Record<string, string>>({});

  const resolvedServiceType = serviceType ?? 'applicant_plan';
  const plansQuery = useQuery({
    queryKey: ['subscription', 'plans', resolvedServiceType],
    queryFn: () => listPricingPlans(resolvedServiceType),
  });
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = profileQuery.data?.data;

  const industryPack = industryKey ? INDUSTRIES.find((i) => i.value === industryKey) : undefined;
  const catalogItem = planId ? CATALOG.find((item) => item.dbId === planId) : undefined;
  const plans = (plansQuery.data?.data ?? []).filter((plan) => {
    if (industryPack) return plan.id === industryPack.planId;
    if (planId) return plan.id === planId;
    return true;
  });

  const screenTitle =
    resolvedServiceType === 'assessment_bundle'
      ? industryPack
        ? `${industryPack.label} Access`
        : 'Industry Assessment Packs'
      : catalogItem
        ? catalogItem.name
        : 'Upgrade to Premium';

  const startCheckoutMutation = useMutation({
    mutationFn: async (plan: PricingPlan) => {
      const createOrderFor = async (subscriptionId: string) => {
        const [order, config] = await Promise.all([
          createRazorpayOrder({
            amount: plan.price_inr,
            subscriptionId,
            serviceType: plan.service_type,
          }),
          getPaymentConfig(),
        ]);
        return {
          keyId: config.data.key_id,
          orderId: order.data.order_id,
          amount: order.data.amount,
          currency: order.data.currency,
          subscriptionId,
        };
      };

      const pendingSubscriptionId = pendingSubscriptionByPlan[plan.id];
      if (pendingSubscriptionId) {
        try {
          return await createOrderFor(pendingSubscriptionId);
        } catch (err) {
          if (!isStalePendingSubscriptionError(err)) throw err;
          setPendingSubscriptionByPlan((prev) => {
            const next = { ...prev };
            delete next[plan.id];
            return next;
          });
        }
      }

      let createdSubscriptionId: string;
      try {
        const sub = await createSubscription(plan.id);
        createdSubscriptionId = sub.data.subscription_id;
      } catch (err) {
        if (!isDuplicateUserPlanError(err) || !pendingSubscriptionId) throw err;
        createdSubscriptionId = pendingSubscriptionId;
      }

      setPendingSubscriptionByPlan((prev) => ({ ...prev, [plan.id]: createdSubscriptionId }));
      return createOrderFor(createdSubscriptionId);
    },
    onSuccess: (result, plan) => {
      setCheckoutOrder(result);
      setCheckoutPlan(plan);
    },
    onError: (err) => {
      if (isDuplicateUserPlanError(err)) {
        setError(
          'A pending order already exists for this plan. Please reopen the same plan and continue payment, or ask backend to clear pending entries.',
        );
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not start checkout. Please try again.');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (success: RazorpaySuccess) =>
      confirmSubscription({
        subscriptionId: checkoutOrder!.subscriptionId,
        paymentMethod: 'razorpay',
        transactionId: success.razorpay_payment_id,
        amountPaid: checkoutOrder!.amount / 100,
      }),
    onSuccess: () => {
      if (checkoutPlan) {
        setPendingSubscriptionByPlan((prev) => {
          const next = { ...prev };
          delete next[checkoutPlan.id];
          return next;
        });
      }
      setConfirmedPlanId(checkoutPlan?.id ?? null);
      setCheckoutOrder(null);
      setCheckoutPlan(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Payment succeeded but confirmation failed. Contact support.');
      setCheckoutOrder(null);
      setCheckoutPlan(null);
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={[styles.header, { borderColor: theme.border }]}>
        <Pressable
          onPress={() => {
            // router.back() doesn't work here: this screen is a hidden sibling
            // Tabs.Screen (href: null), not nested in a Stack under the tab
            // that pushed to it — Expo Router's Tabs navigator has no cross-tab
            // back history, so back() falls through to the tab bar's first
            // screen instead of returning to Assessments. Navigate explicitly.
            router.replace('/(candidate)/assessments');
          }}
          hitSlop={12}
        >
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">{screenTitle}</ThemedText>
      </ThemedView>

      {plansQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : plansQuery.isError ? (
        <View style={styles.emptyState}>
          <ThemedText type="small" style={{ color: theme.danger, textAlign: 'center' }}>
            {plansQuery.error instanceof ApiError ? plansQuery.error.message : 'Could not load this plan. Please try again.'}
          </ThemedText>
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            This plan is no longer available.
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {confirmedPlanId ? (
            <ThemedView style={[styles.successBanner, { backgroundColor: theme.backgroundSelected }]}>
              <FontAwesome6 name="circle-check" size={16} color={theme.secondary} />
              <ThemedText type="small">Subscription activated — enjoy your premium features.</ThemedText>
            </ThemedView>
          ) : null}

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          {plans.map((plan) => {
            const features = parseFeatures(plan.features);
            const isActive = confirmedPlanId === plan.id;
            return (
              <ThemedView key={plan.id} style={[styles.card, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">{plan.name}</ThemedText>
                {plan.description ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {plan.description}
                  </ThemedText>
                ) : null}
                <ThemedText type="title">
                  ₹{plan.price_inr}
                  <ThemedText type="small" themeColor="textSecondary">
                    {' '}
                    / {plan.billing_cycle}
                  </ThemedText>
                </ThemedText>

                {features.map((feature) => (
                  <ThemedView key={feature} style={styles.featureRow}>
                    <FontAwesome6 name="check" size={11} color={theme.secondary} />
                    <ThemedText type="small">{feature.replace(/_/g, ' ')}</ThemedText>
                  </ThemedView>
                ))}

                <Pressable
                  disabled={isActive || startCheckoutMutation.isPending}
                  onPress={() => {
                    setError(null);
                    startCheckoutMutation.mutate(plan);
                  }}
                  style={[styles.subscribeButton, { backgroundColor: isActive ? theme.border : theme.primary }]}
                >
                  {startCheckoutMutation.isPending && startCheckoutMutation.variables?.id === plan.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: '#fff' }}>
                      {isActive ? 'Active' : 'Subscribe'}
                    </ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            );
          })}
        </ScrollView>
      )}

      {checkoutOrder && checkoutPlan ? (
        <RazorpayCheckout
          visible
          keyId={checkoutOrder.keyId}
          orderId={checkoutOrder.orderId}
          amount={checkoutOrder.amount}
          currency={checkoutOrder.currency}
          name="Skreenit Recruitment Platform"
          description={checkoutPlan.name}
          prefill={{
            name: authUser?.full_name ?? '',
            email: authUser?.email ?? '',
            contact: profile?.phone ?? '',
          }}
          onSuccess={(success) => confirmMutation.mutate(success)}
          onDismiss={() => {
            setCheckoutOrder(null);
            setCheckoutPlan(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loader: { marginTop: 40 },
  emptyState: { padding: 30, alignItems: 'center', marginTop: 40 },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, padding: 12 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subscribeButton: {
    marginTop: 8,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
