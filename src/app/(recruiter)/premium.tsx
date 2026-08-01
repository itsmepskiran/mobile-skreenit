import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentWizardModal } from '@/components/assessment-wizard-modal';
import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getProfile } from '@/lib/api/applicant';
import { ApiError } from '@/lib/api/client';
import { listAssessmentConfigs } from '@/lib/api/position-assessments';
import {
  confirmSubscription,
  createRazorpayOrder,
  createSubscription,
  getActiveSubscriptions,
  getPaymentConfig,
  listPricingPlans,
  type PricingPlan,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

// Ported from sql-skreenit's "ATS Services" premium view (dashboard/js/recruiter-dashboard.js
// loadRecruiterPremiumServices/renderSubscribedServices). Web currently gates exactly one
// service behind recruiter_plan: the AI Assessment Wizard + its Configured Assessments table.
export default function RecruiterPremiumScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<{
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    subscriptionId: string;
    plan: PricingPlan;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSubsQuery = useQuery({ queryKey: ['subscription', 'active'], queryFn: getActiveSubscriptions });
  const subscribed =
    activeSubsQuery.data?.data.some((s) => s.service_type === 'recruiter_plan' || s.service_key === 'recruiter_pro') ??
    false;

  const plansQuery = useQuery({
    queryKey: ['subscription', 'plans', 'recruiter_plan'],
    queryFn: () => listPricingPlans('recruiter_plan'),
    enabled: !subscribed && !activeSubsQuery.isLoading,
  });
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile, enabled: !subscribed });

  const configsQuery = useQuery({
    queryKey: ['recruiter', 'assessment-configs'],
    queryFn: listAssessmentConfigs,
    enabled: subscribed,
  });

  const startCheckoutMutation = useMutation({
    mutationFn: async (plan: PricingPlan) => {
      const sub = await createSubscription(plan.id);
      const subscriptionId = sub.data.subscription_id;
      const [order, config] = await Promise.all([
        createRazorpayOrder({ amount: plan.price_inr, subscriptionId, serviceType: plan.service_type }),
        getPaymentConfig(),
      ]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        subscriptionId,
        plan,
      };
    },
    onSuccess: setCheckoutOrder,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not start checkout. Please try again.'),
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
      setCheckoutOrder(null);
      queryClient.invalidateQueries({ queryKey: ['subscription', 'active'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Payment succeeded but confirmation failed. Contact support.');
      setCheckoutOrder(null);
    },
  });

  const profile = profileQuery.data?.data;
  const plans = plansQuery.data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <FontAwesome6 name="crown" size={15} color={theme.primary} />
        <ThemedText type="title">ATS Services</ThemedText>
      </View>

      {activeSubsQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.statusPill, { backgroundColor: subscribed ? '#f0fff4' : theme.backgroundElement }]}>
            <ThemedText type="small" style={{ color: subscribed ? '#2f855a' : theme.textSecondary, fontWeight: '600' }}>
              {subscribed ? 'Premium Active' : 'No Active Premium Subscription'}
            </ThemedText>
          </View>

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          {subscribed ? (
            <>
              <ThemedView style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardHeaderRow}>
                  <FontAwesome6 name="wand-magic-sparkles" size={16} color={theme.primary} />
                  <ThemedText type="subtitle">Assessments for a Job</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Upload a job description for AI-recommended assessments, or browse 60+ tests across 12 industries.
                </ThemedText>
                <Pressable style={[styles.getStartedButton, { backgroundColor: theme.primary }]} onPress={() => setWizardOpen(true)}>
                  <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                    Get Started
                  </ThemedText>
                  <FontAwesome6 name="arrow-right" size={12} color="#fff" />
                </Pressable>
              </ThemedView>

              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Configured Assessments
              </ThemedText>
              {configsQuery.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (configsQuery.data?.data.length ?? 0) === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No jobs have assessments configured yet.
                </ThemedText>
              ) : (
                configsQuery.data!.data.map((row) => (
                  <ThemedView key={row.job_id} style={[styles.configRow, { borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{row.job_title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {row.assessments.length} assessment(s) · {row.status}
                      </ThemedText>
                    </View>
                  </ThemedView>
                ))
              )}
            </>
          ) : (
            <>
              <ThemedView style={[styles.card, { borderColor: theme.border }]}>
                <ThemedText type="subtitle">AI-Recommended or Hand-Picked Assessments</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Upload a job description and get AI-recommended assessments from 60+ tests across 12 industries, or
                  browse and hand-pick the ones you want for each job.
                </ThemedText>
              </ThemedView>

              {plansQuery.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                plans.map((plan) => (
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
                    <Pressable
                      style={[styles.subscribeButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        setError(null);
                        startCheckoutMutation.mutate(plan);
                      }}
                      disabled={startCheckoutMutation.isPending}
                    >
                      {startCheckoutMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText type="smallBold" style={{ color: '#fff' }}>
                          Subscribe
                        </ThemedText>
                      )}
                    </Pressable>
                  </ThemedView>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      <AssessmentWizardModal
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ['recruiter', 'assessment-configs'] });
        }}
      />

      {checkoutOrder ? (
        <RazorpayCheckout
          visible
          keyId={checkoutOrder.keyId}
          orderId={checkoutOrder.orderId}
          amount={checkoutOrder.amount}
          currency={checkoutOrder.currency}
          name="Skreenit Recruitment Platform"
          description={checkoutOrder.plan.name}
          prefill={{ name: authUser?.full_name ?? '', email: authUser?.email ?? '', contact: profile?.phone ?? '' }}
          onSuccess={(success) => confirmMutation.mutate(success)}
          onDismiss={() => setCheckoutOrder(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  getStartedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 12, marginTop: 4 },
  sectionTitle: { marginTop: 8 },
  configRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  subscribeButton: { borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
});
