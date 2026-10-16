import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyReferrals } from '@/lib/api/referrals';

// Keep in step with the terms on sql-skreenit's applicant/refer.html and recruiter/refer.html.
const TERMS = (coins: number) => [
  'The referral scheme is open to all registered Skreenit users. Your referral code is personal to you.',
  `You earn ${coins} coins when a new member signs up using your code and confirms their email address. Until the email is confirmed, the referral shows as waiting.`,
  'A referral counts once per person. The code must be entered at sign-up; it cannot be added to an existing account.',
  'You cannot refer yourself. Accounts that share your phone number, and more than one account on the same phone number, do not earn coins.',
  'Referral coins are added to your coin balance and shown in your transaction history. They follow the same usage rules as other Skreenit coins.',
  'Skreenit may change, pause or end the scheme at any time. This page shows what applies today. Coins already credited are not taken back for a change in the scheme.',
  'Skreenit may withhold or reverse coins earned through misuse, fake or duplicate accounts, or anything that goes against the Terms & Conditions of the platform.',
];

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "Refer & Earn" for both roles (mirrors sql-skreenit's applicant/refer.html and recruiter/refer.html).
export function ReferralScreen({ backTo }: { backTo: string }) {
  const theme = useTheme();
  const query = useQuery({ queryKey: ['referrals', 'me'], queryFn: getMyReferrals });
  const d = query.data?.data;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace(backTo as never)} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Refer &amp; Earn</ThemedText>
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : query.isError || !d ? (
        <ThemedText themeColor="textSecondary" style={styles.centered}>Could not load your referral details. Pull back and try again.</ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={[styles.card, { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }]}>
            <View style={styles.row}>
              <FontAwesome6 name="gift" size={16} color="#4338ca" />
              <ThemedText type="smallBold" style={{ color: '#3730a3', flex: 1 }}>
                {d.enabled ? `Earn ${d.reward_coins} coins for every friend who joins` : 'The referral scheme is paused right now'}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: '#4f46e5' }}>
              {d.enabled
                ? `Share your code. When someone signs up with it, ${d.reward_coins} coins are added to your balance${d.referee_bonus_coins ? `, and they get ${d.referee_bonus_coins} coins too` : ''}.${d.requires_verified_email ? ' The coins arrive once they confirm their email.' : ''}`
                : 'Your code still works for sign-ups, but no coins are being added at the moment.'}
            </ThemedText>
            <ThemedView style={[styles.codeBox, { borderColor: '#a5b4fc', backgroundColor: theme.background }]}>
              <ThemedText selectable style={styles.code}>{d.code}</ThemedText>
            </ThemedView>
            <Button title="Share my code" icon="share-nodes" onPress={() => { void Share.share({ message: d.share_text }); }} />
            <Button
              title="Send on WhatsApp"
              variant="secondary"
              icon="whatsapp"
              onPress={() => { void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(d.share_text)}`); }}
            />
          </ThemedView>

          <View style={styles.statRow}>
            <ThemedView style={[styles.stat, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">{d.total}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Joined with your code</ThemedText>
            </ThemedView>
            <ThemedView style={[styles.stat, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">{d.coins_earned}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Coins earned</ThemedText>
            </ThemedView>
          </View>
          {d.pending ? <ThemedText type="small" style={{ color: '#b45309' }}>{d.pending} waiting for email confirmation</ThemedText> : null}

          <ThemedText type="smallBold" style={styles.sectionTitle}>Your referrals</ThemedText>
          {d.referrals.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">No one has joined with your code yet. Share it to get started.</ThemedText>
          ) : (
            d.referrals.map((r, i) => (
              <ThemedView key={`${r.name}-${i}`} style={[styles.refRow, { borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{r.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Joined {formatDate(r.joined_at)}</ThemedText>
                </View>
                {r.status === 'rewarded' ? (
                  <ThemedText type="smallBold" style={{ color: '#16a34a' }}>+{r.coins} coins</ThemedText>
                ) : (
                  <ThemedText type="small" style={{ color: '#b45309' }}>{r.note ?? 'Pending'}</ThemedText>
                )}
              </ThemedView>
            ))
          )}

          <ThemedText type="smallBold" style={styles.sectionTitle}>Terms and conditions</ThemedText>
          <ThemedView style={[styles.terms, { borderColor: theme.border }]}>
            {TERMS(d.reward_coins).map((t, i) => (
              <ThemedText key={i} type="small" themeColor="textSecondary">{`${i + 1}. ${t}`}</ThemedText>
            ))}
          </ThemedView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  loader: { marginTop: 40 },
  centered: { textAlign: 'center', padding: 24 },
  content: { padding: 16, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 4, lineHeight: 36 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 2 },
  sectionTitle: { marginTop: 8 },
  terms: { borderWidth: 1, borderRadius: Radius.md, padding: 12, gap: 8 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
});
