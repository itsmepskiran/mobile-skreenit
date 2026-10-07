import { useCallback, useRef, useState } from 'react';

import { OrderReviewModal, type ReviewedOrder, type ReviewInput } from '@/components/order-review-modal';

// Promise bridge so each screen's existing "start checkout" mutation can await the review step:
//   const reviewed = await reviewOrder({ subscriptionId, name, priceInr, serviceType });
//   if (!reviewed) return null;   // cancelled
// Render `reviewElement` once in the screen.
export function useOrderReview() {
  const [input, setInput] = useState<ReviewInput | null>(null);
  const resolver = useRef<((order: ReviewedOrder | null) => void) | null>(null);

  const reviewOrder = useCallback(
    (next: ReviewInput) =>
      new Promise<ReviewedOrder | null>((resolve) => {
        resolver.current = resolve;
        setInput(next);
      }),
    [],
  );

  const finish = (order: ReviewedOrder | null) => {
    resolver.current?.(order);
    resolver.current = null;
    setInput(null);
  };

  const reviewElement = input ? <OrderReviewModal key={input.subscriptionId} input={input} onDone={finish} /> : null;

  return { reviewOrder, reviewElement };
}
