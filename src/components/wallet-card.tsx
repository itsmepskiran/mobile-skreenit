import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { getCandidateCreditsSummary } from '@/lib/api/candidate-credits';

// Dashboard wallet: coin balance, when welcome coins lapse, Career Pass status, and one-tap top up /
// plans. Reads the same summary as My Purchases.
export function WalletCard() {
  const [now] = useState(() => Date.now());
  const query = useQuery({ queryKey: ['candidate', 'credits-summary'], queryFn: getCandidateCreditsSummary });
  const s = query.data?.data;
  if (!s) return null;

  const expiring = s.welcome_expiring;
  const expiresIn = expiring ? Math.ceil((new Date(expiring.expires_at).getTime() - now) / 86400000) : null;
  const soon = expiresIn !== null && expiresIn <= 14;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.coinIcon}>
          <FontAwesome6 name="coins" size={18} color="#d97706" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" style={{ color: '#92400e' }}>Coin balance</ThemedText>
          <ThemedText type="title" style={{ color: '#78350f' }}>{s.coin_balance}</ThemedText>
        </View>
        {s.career_pass.active ? (
          <View style={styles.pass}>
            <FontAwesome6 name="id-badge" size={11} color="#166534" />
            <ThemedText type="small" style={{ color: '#166534', fontWeight: '700' }}>Career Pass</ThemedText>
          </View>
        ) : null}
      </View>
      {expiring ? (
        <ThemedText type="small" style={{ color: soon ? '#b45309' : '#a16207', fontWeight: soon ? '700' : '400' }}>
          {expiring.coins} welcome coins expire on{' '}
          {new Date(expiring.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {soon ? ` — ${Math.max(expiresIn ?? 0, 0)} days left` : ''}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.primary]} onPress={() => router.push('/(candidate)/my-purchases')}>
          <ThemedText type="smallBold" style={{ color: '#fff' }}>Top up coins</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={() => router.push('/(candidate)/plans')}>
          <ThemedText type="smallBold" style={{ color: '#92400e' }}>View plans</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fde68a' },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  primary: { backgroundColor: '#4f46e5' },
  secondary: { borderWidth: 1, borderColor: '#f59e0b', backgroundColor: '#fff' },
});
