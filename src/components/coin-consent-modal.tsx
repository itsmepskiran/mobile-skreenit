import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCoinQuote, type CoinQuote, type CoinQuoteRequest } from '@/lib/api/coin-quote';

// Confirm-before-spend for every coin/credit-metered action (mirrors sql-skreenit's
// assets/assets/js/coin-consent.js). Usage:
//
//   const { confirmSpend, consentModal } = useCoinConsent();
//   ...
//   if (!(await confirmSpend({ action: 'employability_report' }))) return;
//   ...
//   return (<>{...}{consentModal}</>);
//
// confirmSpend resolves true when the action may proceed: nothing of the user's is spent
// (first-use free, free quota, Career Pass, company quota) or they confirmed the deduction.
// Resolves false on cancel, insufficient coins, or if the cost couldn't be checked (fails
// closed — charging without consent is worse than asking them to retry).

type ModalState =
  | { kind: 'quote'; quote: CoinQuote }
  | { kind: 'error' }
  | null;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function useCoinConsent() {
  const [state, setState] = useState<ModalState>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setState(null);
  }, []);

  const confirmSpend = useCallback(async (req: CoinQuoteRequest): Promise<boolean> => {
    let quote: CoinQuote;
    try {
      quote = (await getCoinQuote(req)).data;
    } catch {
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setState({ kind: 'error' });
      });
    }
    if (!quote.needs_consent) return true;
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ kind: 'quote', quote });
    });
  }, []);

  const consentModal = <CoinConsentModal state={state} onSettle={settle} />;
  return { confirmSpend, consentModal };
}

function CoinConsentModal({ state, onSettle }: { state: ModalState; onSettle: (ok: boolean) => void }) {
  const theme = useTheme();
  if (!state) return null;

  let title: string;
  let message: string;
  let rows: [string, string][] = [];
  let confirmLabel: string | null = null;
  let topUp: (() => void) | null = null;

  if (state.kind === 'error') {
    title = "Couldn't check the cost";
    message = 'Please check your connection and try again. Nothing has been charged.';
  } else {
    const q = state.quote;
    const coins = plural(q.coins_required, 'coin');
    if (q.method === 'invoice') {
      title = `Confirm ${q.label}`;
      message = `₹${q.invoice_inr ?? ''} will be added to your company's invoice for ${q.label}.`;
      confirmLabel = 'Confirm';
      rows = [
        ['Charge', `₹${q.invoice_inr ?? ''}`],
        ['Billed to', 'Company invoice'],
      ];
    } else if (q.method === 'credit') {
      title = `Confirm ${q.label}`;
      message = `This will use 1 ${q.label} credit from your purchased credits.`;
      confirmLabel = 'Use 1 credit';
    } else if (!q.sufficient) {
      title = 'Not enough coins';
      message = `${q.label} needs ${coins}, but your balance is ${plural(q.balance, 'coin')}.`;
      rows = [
        ['Cost', coins],
        ['Your balance', plural(q.balance, 'coin')],
        ['Short by', plural(q.coins_required - q.balance, 'coin')],
      ];
      topUp = () => {
        onSettle(false);
        router.push(q.coin_balance_key === 'candidate_coins' ? '/(candidate)/my-purchases' : '/(recruiter)/credits');
      };
    } else {
      const free = q.free_units > 0 && q.units > 1
        ? ` ${plural(q.free_units, 'use')} ${q.free_units === 1 ? 'is' : 'are'} free; the other ${q.paid_units} will be charged.`
        : '';
      title = `Confirm ${q.label}`;
      message = `${coins} will be deducted from your balance for ${q.label}.${free}`;
      confirmLabel = `Use ${coins}`;
      rows = [
        ['Cost', coins],
        ['Current balance', plural(q.balance, 'coin')],
        ['Balance after', plural(q.balance_after ?? 0, 'coin')],
      ];
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onSettle(false)}>
      <Pressable style={styles.backdrop} onPress={() => onSettle(false)}>
        <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <View style={styles.titleRow}>
            <FontAwesome6 name={state.kind === 'error' ? 'triangle-exclamation' : 'coins'} size={16} color="#d97706" />
            <ThemedText type="subtitle">{title}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          {rows.length ? (
            <View style={[styles.rows, { borderColor: theme.border }]}>
              {rows.map(([k, v], i) => (
                <View key={k} style={[styles.row, i > 0 && { borderTopWidth: 1, borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">{k}</ThemedText>
                  <ThemedText type="smallBold" style={k === 'Cost' || k === 'Short by' || k === 'Charge' ? { color: '#b45309' } : undefined}>{v}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable style={[styles.button, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => onSettle(false)}>
              <ThemedText type="smallBold">{state.kind === 'error' ? 'OK' : 'Cancel'}</ThemedText>
            </Pressable>
            {topUp ? (
              <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={topUp}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>Top up coins</ThemedText>
              </Pressable>
            ) : confirmLabel ? (
              <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => onSettle(true)}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>{confirmLabel}</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: Radius.lg, padding: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rows: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  button: { borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
});
