import { Modal, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Shown before the Career Pass checkout: what the pass includes and its live price (from the plan
// row — never typed here), then "Continue" to payment. Mirrors the web's My Purchases modal.
const INCLUDED: { icon: React.ComponentProps<typeof FontAwesome6>['name']; title: string; desc: string }[] = [
  { icon: 'pen-nib', title: 'AI Resume Writing', desc: 'Unlimited rewrites, or build a resume from scratch with AI.' },
  { icon: 'file-contract', title: 'Employability Report', desc: 'Your resume analysis and assessments in one report, as often as you like.' },
  { icon: 'brain', title: 'Intro Video Analysis', desc: 'Resume-based video questions with a full report on your speaking and confidence.' },
];

export function CareerPassModal({
  visible,
  priceLabel,
  loading,
  onContinue,
  onClose,
}: {
  visible: boolean;
  priceLabel: string;
  loading: boolean;
  onContinue: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <View style={styles.titleRow}>
            <FontAwesome6 name="id-badge" size={16} color="#4338ca" />
            <ThemedText type="subtitle">Career Pass</ThemedText>
          </View>
          {priceLabel ? <ThemedText type="title">{priceLabel}</ThemedText> : null}
          <ThemedText type="small" themeColor="textSecondary">
            Resume writing, reports and video analysis, unlimited — no coins spent while your pass is active. (Mock interviews have
            their own plans.)
          </ThemedText>
          {INCLUDED.map((i) => (
            <View key={i.title} style={styles.item}>
              <View style={styles.icon}>
                <FontAwesome6 name={i.icon} size={14} color="#4338ca" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{i.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{i.desc}</ThemedText>
              </View>
            </View>
          ))}
          <View style={styles.actions}>
            <Pressable style={[styles.button, { borderColor: theme.border, borderWidth: 1 }]} onPress={onClose}>
              <ThemedText type="smallBold">Not now</ThemedText>
            </Pressable>
            <Pressable style={[styles.button, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]} onPress={onContinue} disabled={loading}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>{loading ? 'Please wait…' : 'Continue to checkout'}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, borderRadius: Radius.lg, padding: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  button: { borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
});
