import { useCallback, useRef, useState } from 'react';

import { OrderReviewModal, type ReviewedOrder, type ReviewInput } from '@/components/order-review-modal';
import { PaymentReceiptModal, type PaymentReceipt } from '@/components/payment-receipt-modal';
import type { RazorpaySuccess } from '@/components/razorpay-checkout';

// Promise bridge so each screen's existing "start checkout" mutation can await the review step:
//   const reviewed = await reviewOrder({ subscriptionId, name, priceInr, serviceType });
//   if (!reviewed) return null;   // cancelled
// After Razorpay completes, call showReceipt(success, 'confirmed' | 'unconfirmed') to show what was
// bought and paid. Render `reviewElement` once in the screen — it hosts both the review and receipt.
export function useOrderReview() {
  const [input, setInput] = useState<ReviewInput | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const resolver = useRef<((order: ReviewedOrder | null) => void) | null>(null);
  const reviewed = useRef(new Map<string, ReviewedOrder>());

  const reviewOrder = useCallback(
    (next: ReviewInput) =>
      new Promise<ReviewedOrder | null>((resolve) => {
        resolver.current = resolve;
        setInput(next);
      }),
    [],
  );

  const finish = (order: ReviewedOrder | null) => {
    if (order) reviewed.current.set(order.orderId, order);
    resolver.current?.(order);
    resolver.current = null;
    setInput(null);
  };

  const showReceipt = useCallback((success: RazorpaySuccess, outcome: PaymentReceipt['outcome']) => {
    const order = reviewed.current.get(success.razorpay_order_id);
    setReceipt({
      outcome,
      planName: order?.name ?? 'Skreenit purchase',
      priceInr: order ? order.priceInr : null,
      discountInr: order?.discountInr ?? 0,
      couponCode: order?.couponCode ?? null,
      paidInr: order ? order.amount / 100 : 0,
      paymentId: success.razorpay_payment_id,
      orderId: success.razorpay_order_id,
      paidAt: new Date(),
    });
  }, []);

  const reviewElement = (
    <>
      {input ? <OrderReviewModal key={input.subscriptionId} input={input} onDone={finish} /> : null}
      {receipt ? <PaymentReceiptModal receipt={receipt} onClose={() => setReceipt(null)} /> : null}
    </>
  );

  return { reviewOrder, reviewElement, showReceipt };
}
