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
import { confirmCreditPurchase, createCreditOrder } from '@/lib/api/credits';
import {
  analyzeOwnResume,
  EmployabilityReportError,
  generateEmployabilityReport,
  getOwnResumeAnalysis,
} from '@/lib/api/employability-report';
import { getPaymentConfig } from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

export default function EmployabilityReportScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [needsCredit, setNeedsCredit] = useState(false);
  const [needsResume, setNeedsResume] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<{
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    planId: string;
    planName: string;
    priceInr: number;
  } | null>(null);

  const analysisQuery = useQuery({ queryKey: ['candidate', 'resume-analysis'], queryFn: getOwnResumeAnalysis });
  const hasAnalysis = !!analysisQuery.data?.data;

  const analyzeMutation = useMutation({
    mutationFn: analyzeOwnResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', 'resume-analysis'] });
    },
    onError: (err) => {
      setNeedsResume(
        err instanceof Error && err.message ? err.message : 'Upload your resume in Profile Settings first.',
      );
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateEmployabilityReport,
    onSuccess: () => setStatus({ kind: 'success', message: 'Your report downloaded successfully.' }),
    onError: (err) => {
      if (err instanceof EmployabilityReportError) {
        if (err.kind === 'needs_credit') {
          setNeedsCredit(true);
          return;
        }
        if (err.kind === 'needs_resume') {
          setNeedsResume(err.message);
          return;
        }
      }
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
    },
  });

  const startCheckoutMutation = useMutation({
    mutationFn: async () => {
      const [order, config] = await Promise.all([createCreditOrder('employability_report'), getPaymentConfig()]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        planId: order.data.plan_id,
        planName: order.data.plan_name,
        priceInr: order.data.price_inr,
      };
    },
    onSuccess: setCheckoutOrder,
    onError: () => setStatus({ kind: 'error', message: 'Could not start checkout. Please try again.' }),
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
      setNeedsCredit(false);
      generateMutation.mutate();
    },
    onError: () => {
      setCheckoutOrder(null);
      setStatus({ kind: 'error', message: 'Payment succeeded but confirmation failed. Contact support.' });
    },
  });

  const onGeneratePress = () => {
    setStatus(null);
    setNeedsCredit(false);
    setNeedsResume(null);
    generateMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(candidate)/profile')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Employability Report</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.cardTitleRow}>
            <FontAwesome6 name="file-shield" size={16} color={theme.primary} />
            <ThemedText type="subtitle">Personal Employability Report</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            A recruiter-style PDF built from your resume analysis and completed assessment scores — see yourself the way
            recruiters do.
          </ThemedText>
        </ThemedView>

        {analysisQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : !hasAnalysis ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Step 1: Analyze Your Resume</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              This report is built from your resume analysis — run it once first.
            </ThemedText>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setNeedsResume(null);
                analyzeMutation.mutate();
              }}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome6 name="magnifying-glass" size={13} color="#fff" />
              )}
              <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze My Resume'}
              </ThemedText>
            </Pressable>
            {needsResume ? (
              <View style={styles.noticeRow}>
                <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
                  {needsResume}
                </ThemedText>
                <Pressable onPress={() => router.push('/(candidate)/profile')}>
                  <ThemedText type="small" themeColor="primary">
                    Go to Profile
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </ThemedView>
        ) : (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Step 2: Generate Your Report</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Costs a credit per generation, or free with an active Career Pass.
            </ThemedText>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={onGeneratePress}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome6 name="file-pdf" size={13} color="#fff" />
              )}
              <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                {generateMutation.isPending ? 'Generating your report…' : 'Generate My Report'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {needsCredit ? (
          <ThemedView style={[styles.lockedCard, { borderColor: '#f59e0b', backgroundColor: '#fffbeb' }]}>
            <FontAwesome6 name="coins" size={18} color="#d97706" />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ color: '#92400e' }}>
                You need a report credit
              </ThemedText>
              <ThemedText type="small" style={{ color: '#a16207' }}>
                Each report costs a credit, or go unlimited with Career Pass.
              </ThemedText>
            </View>
            <Pressable
              style={[styles.buyButton, { backgroundColor: theme.primary }]}
              onPress={() => startCheckoutMutation.mutate()}
              disabled={startCheckoutMutation.isPending}
            >
              {startCheckoutMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  Buy Credit
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        ) : null}

        {status ? (
          <ThemedText type="small" style={{ color: status.kind === 'success' ? '#2f855a' : theme.danger }}>
            {status.message}
          </ThemedText>
        ) : null}
      </ScrollView>

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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loader: { marginTop: 24 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 12 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  buyButton: { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
});
