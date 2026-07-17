import { FontAwesome6 } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseHistoryItem } from '@/lib/api/subscription';

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: 'Active', bg: '#f0fff4', fg: '#2f855a' },
  trial: { label: 'Trial', bg: '#ebf8ff', fg: '#2b6cb0' },
  pending: { label: 'Pending', bg: '#fffaf0', fg: '#c05621' },
  expired: { label: 'Expired', bg: '#f1f5f9', fg: '#475569' },
  cancelled: { label: 'Cancelled', bg: '#fff5f5', fg: '#c53030' },
};
const DEFAULT_STYLE = { label: 'Unknown', bg: '#f1f5f9', fg: '#475569' };

interface PurchaseHistoryRowProps {
  item: PurchaseHistoryItem;
  onDownloadReceipt: () => void;
  onRetryPayment: () => void;
  retrying?: boolean;
}

export function PurchaseHistoryRow({ item, onDownloadReceipt, onRetryPayment, retrying }: PurchaseHistoryRowProps) {
  const theme = useTheme();
  const statusStyle = STATUS_STYLE[item.status] ?? DEFAULT_STYLE;

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
          {item.plan_name}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <ThemedText type="small" style={{ color: statusStyle.fg, fontWeight: '600' }}>
            {statusStyle.label}
          </ThemedText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <FontAwesome6 name="calendar" size={11} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
        {item.amount_paid != null ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              ·
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ₹{item.amount_paid}
            </ThemedText>
          </>
        ) : null}
        {item.payment_method ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              ·
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.capitalize}>
              {item.payment_method}
            </ThemedText>
          </>
        ) : null}
      </View>

      <View style={styles.idBlock}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          Subscription ID: {item.subscription_id}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          Order ID: {item.razorpay_order_id ?? '-'}
        </ThemedText>
      </View>

      {item.status === 'active' ? (
        <Button title="Download Receipt" variant="secondary" icon="download" onPress={onDownloadReceipt} style={styles.actionButton} />
      ) : item.status === 'pending' ? (
        <Button
          title="Retry Payment"
          icon="rotate-right"
          loading={retrying}
          onPress={onRetryPayment}
          style={styles.actionButton}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  capitalize: { textTransform: 'capitalize' },
  idBlock: { gap: 2, marginTop: 2 },
  actionButton: { marginTop: 8 },
});
