import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchaseHistoryRow } from '@/components/purchase-history-row';
import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOrderReview } from '@/hooks/use-order-review';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import {
    confirmSubscription,
    getPurchaseHistory,
    getSubscriptionOrder,
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
  const { reviewOrder, reviewElement, showReceipt } = useOrderReview();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['subscription', 'history'],
    queryFn: getPurchaseHistory,
  });

  const purchases = data?.data ?? [];

  const retryMutation = useMutation({
    mutationFn: async (item: PurchaseHistoryItem) => {
      // Retrying an unpaid order also goes through the review step, so a coupon can be applied.
      // amount_paid is 0 until payment lands, so read the plan price from the order itself.
      const order = await getSubscriptionOrder(item.subscription_id);
      return reviewOrder({
        subscriptionId: item.subscription_id,
        name: item.plan_name,
        priceInr: Number(order.data.amount ?? 0),
        serviceType: item.service_type,
      });
    },
    onSuccess: (result) => {
      setError(null);
      if (result) setCheckout(result);
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
    onSuccess: (_data, success) => {
      setCheckout(null);
      showReceipt(success, 'confirmed');
      queryClient.invalidateQueries({ queryKey: ['subscription', 'history'] });
    },
    onError: (_err, success) => {
      setCheckout(null);
      showReceipt(success, 'unconfirmed');
      queryClient.invalidateQueries({ queryKey: ['subscription', 'history'] });
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.replace(backTo)} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Purchase History</ThemedText>
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

      {reviewElement}

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
