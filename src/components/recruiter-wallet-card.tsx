import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { ThemedText } from '@/components/themed-text';
import { cardSurface, Radius } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';
import { getCoinSummary } from '@/lib/api/credits';
import { getCompanyQuotaStatus } from '@/lib/api/recruiter';

// Recruiter dashboard headline: coin balance for individual recruiters, or the pooled quarterly
// quota (resume analyses etc.) for company plans, with one-tap top up / billing.
export function RecruiterWalletCard() {
  const theme = useBaseTheme();
  const quotaQuery = useQuery({ queryKey: ['recruiter', 'company-quota'], queryFn: getCompanyQuotaStatus, retry: false });
  const coinsQuery = useQuery({ queryKey: ['recruiter', 'coin-summary'], queryFn: getCoinSummary, enabled: quotaQuery.isError });

  if (quotaQuery.isSuccess) {
    const q = quotaQuery.data.data;
    const entries = Object.values(q.quotas ?? {});
    const remaining = entries.reduce((sum, e) => sum + (e.remaining || 0), 0);
    const pool = entries.reduce((sum, e) => sum + (e.pool || 0), 0);
    return (
      <View style={[styles.card, cardSurface(theme), { borderColor: '#c7d2fe' }]}>
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: '#eef2ff' }]}>
            <FontAwesome6 name="building" size={18} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="small" themeColor="textSecondary">{q.plan_name ?? 'Company plan'}{q.seat_count ? ` · ${q.seat_count} seats` : ''}</ThemedText>
            <ThemedText type="title" style={{ color: '#312e81' }}>
              {remaining}
              <ThemedText type="small" themeColor="textSecondary">{`  / ${pool} left this quarter`}</ThemedText>
            </ThemedText>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={[styles.button, { backgroundColor: '#4f46e5' }]} onPress={() => router.push('/(recruiter)/company-quota')}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>View quota</ThemedText>
          </Pressable>
          <Pressable style={[styles.button, styles.ghost]} onPress={() => router.push('/(recruiter)/billing')}>
            <ThemedText type="smallBold" style={{ color: '#4f46e5' }}>Billing & plan</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const s = coinsQuery.data?.data;
  if (!s) return null;
  return (
    <View style={[styles.card, cardSurface(theme), { borderColor: '#fde68a' }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: '#fffbeb' }]}>
          <FontAwesome6 name="coins" size={18} color="#d97706" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" style={{ color: '#92400e' }}>Coin balance</ThemedText>
          <ThemedText type="title" style={{ color: '#78350f' }}>{s.balance}</ThemedText>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: '#4f46e5' }]} onPress={() => router.push('/(recruiter)/credits')}>
          <ThemedText type="smallBold" style={{ color: '#fff' }}>Top up coins</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, styles.ghostAmber]} onPress={() => router.push('/(recruiter)/billing')}>
          <ThemedText type="smallBold" style={{ color: '#92400e' }}>Billing & plan</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, alignItems: 'center', borderRadius: Radius.md, paddingVertical: 11 },
  ghost: { borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#fff' },
  ghostAmber: { borderWidth: 1, borderColor: '#f59e0b', backgroundColor: '#fff' },
});
