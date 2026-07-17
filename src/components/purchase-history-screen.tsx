import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchaseHistoryRow } from '@/components/purchase-history-row';
import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import {
    confirmSubscription,
    createRazorpayOrder,
    getPaymentConfig,
    getPurchaseHistory,
    type PurchaseHistoryItem,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';
import { API_V1 } from '@/lib/config';

interface CheckoutState {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  subscriptionId: string;
}

// Hidden Tabs.Screen sibling (href: null) linked from Profile — same
// cross-tab back-history gap as notifications.tsx, so navigate explicitly
// rather than router.back().
export function PurchaseHistoryScreen({ backTo }: { backTo: Href }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['subscription', 'history'],
    queryFn: getPurchaseHistory,
  });

  const purchases = data?.data ?? [];

  const retryMutation = useMutation({
    mutationFn: async (item: PurchaseHistoryItem) => {
      const [order, config] = await Promise.all([
        createRazorpayOrder({
          amount: item.amount_paid ?? 0,
          subscriptionId: item.subscription_id,
          serviceType: item.service_type,
        }),
        getPaymentConfig(),
      ]);
      return {
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        subscriptionId: item.subscription_id,
      };
    },
    onSuccess: (result) => {
      setError(null);
      setCheckout(result);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not start payment. Please try again.');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (success: RazorpaySuccess) =>
      confirmSubscription({
        subscriptionId: checkout!.subscriptionId,
        paymentMethod: 'razorpay',
        transactionId: success.razorpay_payment_id,
        amountPaid: checkout!.amount / 100,
      }),
    onSuccess: () => {
      setCheckout(null);
      queryClient.invalidateQueries({ queryKey: ['subscription', 'history'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Payment succeeded but confirmation failed. Contact support.');
      setCheckout(null);
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.replace(backTo)} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Purchase History</ThemedText>
      </ThemedView>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger, paddingHorizontal: 20, paddingTop: 8 }}>
          {error}
        </ThemedText>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load purchase history. Pull down to retry.</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.subscription_id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <PurchaseHistoryRow
              item={item}
              retrying={retryMutation.isPending && retryMutation.variables?.subscription_id === item.subscription_id}
              onDownloadReceipt={() => Linking.openURL(`${API_V1}/subscription/${item.subscription_id}/receipt`)}
              onRetryPayment={() => {
                setError(null);
                retryMutation.mutate(item);
              }}
            />
          )}
          ListEmptyComponent={
            <ThemedView style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">No purchases yet.</ThemedText>
            </ThemedView>
          }
        />
      )}

      {checkout ? (
        <RazorpayCheckout
          visible
          keyId={checkout.keyId}
          orderId={checkout.orderId}
          amount={checkout.amount}
          currency={checkout.currency}
          name="Skreenit Recruitment Platform"
          description="Complete your payment"
          prefill={{ name: authUser?.full_name ?? '', email: authUser?.email ?? '' }}
          onSuccess={(success) => confirmMutation.mutate(success)}
          onDismiss={() => setCheckout(null)}
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
    paddingTop: 12,
    paddingBottom: 4,
  },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  listContent: { padding: 20 },
});
