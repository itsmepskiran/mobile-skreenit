import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { useOrderReview } from '@/hooks/use-order-review';
import { confirmSubscription, createSubscription, type PricingPlan } from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

type Order = { keyId: string; orderId: string; amount: number; currency: string; name: string; subscriptionId: string };

// One place for "buy a subscription plan with Razorpay" — create the subscription, create the
// order, show the checkout sheet, confirm the payment. Shared by the Plans, Mock Interview and
// My Purchases screens. Render `checkoutElement` once in the screen.
export function usePlanCheckout(onPaid?: () => void) {
  const authUser = useAuthStore((state) => state.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { reviewOrder, reviewElement, showReceipt } = useOrderReview();

  const start = useMutation({
    mutationFn: async (plan: PricingPlan): Promise<Order | null> => {
      const sub = await createSubscription(plan.id);
      // Review step: coupon entry + effective price, then the order is created at the final amount.
      return reviewOrder({
        subscriptionId: sub.data.subscription_id,
        name: plan.name,
        priceInr: plan.price_inr,
        serviceType: plan.service_type,
      });
    },
    onSuccess: (next) => {
      if (next) setOrder(next);
    },
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
    onSuccess: (_data, success) => {
      setOrder(null);
      showReceipt(success, 'confirmed');
      onPaid?.();
    },
    onError: (_err, success) => {
      setOrder(null);
      showReceipt(success, 'unconfirmed');
    },
  });

  const razorpayElement = order ? (
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

  const checkoutElement = (
    <>
      {reviewElement}
      {razorpayElement}
    </>
  );

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
