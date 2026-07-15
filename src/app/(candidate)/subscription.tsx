import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/store';
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

export default function SubscriptionScreen() {
  const theme = useTheme();
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

  const plansQuery = useQuery({ queryKey: ['subscription', 'plans'], queryFn: () => listPricingPlans('applicant_plan') });
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const plans = plansQuery.data?.data ?? [];
  const profile = profileQuery.data?.data;

  const startCheckoutMutation = useMutation({
    mutationFn: async (plan: PricingPlan) => {
      const sub = await createSubscription(plan.id);
      const [order, config] = await Promise.all([
        createRazorpayOrder({
          amount: sub.data.amount,
          subscriptionId: sub.data.subscription_id,
          serviceType: plan.service_type,
        }),
        getPaymentConfig(),
      ]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        subscriptionId: sub.data.subscription_id,
      };
    },
    onSuccess: (result, plan) => {
      setCheckoutOrder(result);
      setCheckoutPlan(plan);
    },
    onError: (err) => {
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Upgrade to Premium</ThemedText>
      </ThemedView>

      {plansQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
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
