import { Modal, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PaymentReceipt {
  // 'confirmed': payment captured and the purchase is active.
  // 'unconfirmed': Razorpay took the payment but our server couldn't confirm it yet.
  outcome: 'confirmed' | 'unconfirmed';
  planName: string;
  priceInr: number | null;
  discountInr: number;
  couponCode: string | null;
  paidInr: number;
  paymentId: string;
  orderId: string;
  paidAt: Date;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// Mobile counterpart of sql-skreenit's Payments/confirmation.html: what was bought, what was paid,
// and the payment reference, shown once a Razorpay payment completes.
export function PaymentReceiptModal({ receipt, onClose }: { receipt: PaymentReceipt; onClose: () => void }) {
  const theme = useTheme();
  const ok = receipt.outcome === 'confirmed';
  const color = ok ? theme.secondary : theme.accent;

  const rows: [string, string][] = [['Plan', receipt.planName]];
  if (receipt.priceInr != null) rows.push(['Price', rupees(receipt.priceInr)]);
  if (receipt.couponCode) rows.push([`Coupon “${receipt.couponCode}”`, `− ${rupees(receipt.discountInr)}`]);
  rows.push(['Amount paid', rupees(receipt.paidInr)]);
  rows.push(['Payment ID', receipt.paymentId]);
  if (receipt.orderId) rows.push(['Order ID', receipt.orderId]);
  rows.push(['Date', receipt.paidAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <FontAwesome6 name={ok ? 'check' : 'clock'} size={22} color="#fff" />
          </View>
          <ThemedText type="subtitle" style={styles.center}>{ok ? 'Payment successful' : 'Payment received'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {ok
              ? 'Your purchase is active. Thank you!'
              : "We received your payment but couldn't confirm it just yet. It will show in Purchase History shortly — please don't pay again. If it stays Pending, contact support with the Payment ID below."}
          </ThemedText>

          <View style={[styles.rows, { borderColor: theme.border }]}>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
                <ThemedText type="smallBold" style={styles.value} numberOfLines={1} selectable>{value}</ThemedText>
              </View>
            ))}
          </View>

          <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={onClose}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, borderRadius: Radius.lg, padding: 20, gap: 10, alignItems: 'stretch' },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  center: { textAlign: 'center' },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 8, marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  value: { flexShrink: 1, textAlign: 'right' },
  button: { borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
});
