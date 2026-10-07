import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createRazorpayOrder, getPaymentConfig, validateCoupon, type CouponQuote } from '@/lib/api/subscription';

export interface ReviewInput {
  subscriptionId: string;
  name: string;
  priceInr: number;
  serviceType: string;
}

// What the screens need to open Razorpay — the order is created here, after the coupon is settled,
// so its amount is already the discounted one (the server prices it; the client never sends it).
export interface ReviewedOrder {
  keyId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  name: string;
  subscriptionId: string;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// "Review order" step shown before Razorpay: plan, price, optional coupon, effective price.
// Mirrors sql-skreenit's Payments/payments.html. Calls onDone(order) on Pay, onDone(null) on cancel.
export function OrderReviewModal({ input, onDone }: { input: ReviewInput; onDone: (order: ReviewedOrder | null) => void }) {
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = coupon ? coupon.final_amount : input.priceInr;

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setCouponError('Enter a coupon code');
      return;
    }
    setChecking(true);
    setCouponError(null);
    try {
      const res = await validateCoupon({ subscriptionId: input.subscriptionId, code: trimmed });
      setCoupon(res.data);
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof Error && err.message ? err.message : 'Could not apply this coupon.');
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    setCoupon(null);
    setCode('');
    setCouponError(null);
  };

  const pay = async () => {
    setPaying(true);
    setError(null);
    try {
      const [order, config] = await Promise.all([
        createRazorpayOrder({
          amount: input.priceInr,
          subscriptionId: input.subscriptionId,
          serviceType: input.serviceType,
          couponCode: coupon?.code ?? null,
        }),
        getPaymentConfig(),
      ]);
      onDone({
        keyId: config.data.key_id,
        orderId: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: input.name,
        subscriptionId: input.subscriptionId,
      });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onDone(null)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={() => !paying && onDone(null)}>
          <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="subtitle">Review order</ThemedText>
            <ThemedText type="smallBold">{input.name}</ThemedText>

            <View style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">Price</ThemedText>
              <ThemedText type="small">{rupees(input.priceInr)}</ThemedText>
            </View>
            {coupon ? (
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">Coupon “{coupon.code}”</ThemedText>
                <ThemedText type="small" style={{ color: theme.secondary }}>− {rupees(coupon.discount_amount)}</ThemedText>
              </View>
            ) : null}
            <View style={[styles.row, styles.totalRow, { borderTopColor: theme.border }]}>
              <ThemedText type="smallBold">Total</ThemedText>
              <ThemedText type="subtitle">{rupees(total)}</ThemedText>
            </View>

            <View style={styles.couponRow}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                editable={!coupon && !checking && !paying}
                placeholder="Have a coupon code?"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={50}
                onSubmitEditing={apply}
                style={[styles.input, { color: theme.text, borderColor: couponError ? theme.danger : theme.border, backgroundColor: theme.background }]}
              />
              <Pressable
                style={[styles.applyButton, { borderColor: theme.primary, opacity: checking || paying ? 0.6 : 1 }]}
                onPress={coupon ? remove : apply}
                disabled={checking || paying}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {checking ? 'Checking…' : coupon ? 'Remove' : 'Apply'}
                </ThemedText>
              </Pressable>
            </View>
            {couponError ? <ThemedText type="small" style={{ color: theme.danger }}>{couponError}</ThemedText> : null}
            {coupon ? (
              <ThemedText type="small" style={{ color: theme.secondary }}>
                Coupon applied — you save {rupees(coupon.discount_amount)}.
              </ThemedText>
            ) : null}
            {error ? <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText> : null}

            <View style={styles.actions}>
              <Pressable style={[styles.button, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => onDone(null)} disabled={paying}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable style={[styles.button, { backgroundColor: theme.primary, opacity: paying ? 0.6 : 1 }]} onPress={pay} disabled={paying}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>{paying ? 'Please wait…' : `Pay ${rupees(total)}`}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, borderRadius: Radius.lg, padding: 20, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 2 },
  couponRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  applyButton: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 6 },
  button: { borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
});
