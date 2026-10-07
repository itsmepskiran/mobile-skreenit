import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import {
  confirmSubscription,
  createRazorpayOrder,
  createSubscription,
  getPaymentConfig,
  type PricingPlan,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

type Order = { keyId: string; orderId: string; amount: number; currency: string; name: string; subscriptionId: string };

// One place for "buy a subscription plan with Razorpay" — create the subscription, create the
// order, show the checkout sheet, confirm the payment. Shared by the Plans, Mock Interview and
// My Purchases screens. Render `checkoutElement` once in the screen.
export function usePlanCheckout(onPaid?: () => void) {
  const authUser = useAuthStore((state) => state.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: async (plan: PricingPlan): Promise<Order> => {
      const sub = await createSubscription(plan.id);
      const [rzp, config] = await Promise.all([
        createRazorpayOrder({ amount: plan.price_inr, subscriptionId: sub.data.subscription_id, serviceType: plan.service_type }),
        getPaymentConfig(),
      ]);
      return {
        keyId: config.data.key_id,
        orderId: rzp.data.order_id,
        amount: rzp.data.amount,
        currency: rzp.data.currency,
        name: plan.name,
        subscriptionId: sub.data.subscription_id,
      };
    },
    onSuccess: setOrder,
    onError: (err) => setError(err instanceof Error && err.message ? err.message : 'Could not start checkout. Please try again.'),
  });

  const confirm = useMutation({
    mutationFn: (success: RazorpaySuccess) => {
      if (!order) throw new Error('No checkout in progress.');
      return confirmSubscription({
        subscriptionId: order.subscriptionId,
        paymentMethod: 'razorpay',
        transactionId: success.razorpay_payment_id,
        amountPaid: order.amount / 100,
      });
    },
    onSuccess: () => {
      setOrder(null);
      onPaid?.();
    },
    onError: () => {
      setOrder(null);
      setError('Payment succeeded but confirmation failed. Contact support.');
    },
  });

  const checkoutElement = order ? (
    <RazorpayCheckout
      visible
      keyId={order.keyId}
      orderId={order.orderId}
      amount={order.amount}
      currency={order.currency}
      name="Skreenit Recruitment Platform"
      description={order.name}
      prefill={{ name: authUser?.full_name ?? '', email: authUser?.email ?? '' }}
      onSuccess={(success) => confirm.mutate(success)}
      onDismiss={() => setOrder(null)}
    />
  ) : null;

  return {
    buy: (plan: PricingPlan) => {
      setError(null);
      start.mutate(plan);
    },
    pendingPlanId: start.isPending ? start.variables?.id : undefined,
    error,
    checkoutElement,
  };
}
