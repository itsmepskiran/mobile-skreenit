import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { FontAwesome6, Pressable } from '@/components/scoped';
import { ThemedText } from '@/components/themed-text';
import { cardSurface, Radius } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';

type Action = { icon: React.ComponentProps<typeof FontAwesome6>['name']; label: string; href: string; colors: readonly [string, string] };

const ACTIONS: Action[] = [
  { icon: 'file-lines', label: 'Analyse resumes', href: '/(recruiter)/resume-analysis', colors: ['#6366f1', '#8b5cf6'] },
  { icon: 'magnifying-glass', label: 'Find candidates', href: '/(recruiter)/candidate-search', colors: ['#0ea5e9', '#06b6d4'] },
  { icon: 'calendar-days', label: 'Schedule interview', href: '/(recruiter)/interviews-calendar', colors: ['#10b981', '#14b8a6'] },
  { icon: 'star', label: 'Feature a job', href: '/(recruiter)/featured-jobs', colors: ['#f97316', '#ef4444'] },
  { icon: 'pen-nib', label: 'Write a JD', href: '/(recruiter)/jd-writer', colors: ['#f59e0b', '#f97316'] },
];

// Horizontal strip of one-tap shortcuts to the recruiter's most-used tools.
export function QuickActions() {
  const theme = useBaseTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ACTIONS.map((a) => (
        <Pressable key={a.label} style={[styles.card, cardSurface(theme)]} onPress={() => router.push(a.href as never)}>
          <LinearGradient colors={a.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
            <FontAwesome6 name={a.icon} size={16} color="#fff" />
          </LinearGradient>
          <ThemedText type="small" style={styles.label}>{a.label}</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingRight: 20 },
  card: { width: 104, borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center', fontSize: 12, lineHeight: 16 },
});
