import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientScreen } from '@/components/on-gradient';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeRate, getCandidateRates, type CandidateRates } from '@/lib/api/service-rates';

// Mobile twin of the web dashboard's "Premium Services" view: one card per paid candidate
// service, each showing its live price from the pricing table.
type Service = {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  description: string;
  rate?: keyof CandidateRates;
  href: string;
  note?: string;
};

const COLORS: Record<string, readonly [string, string]> = {
  'pen-nib': ['#6366f1', '#8b5cf6'],
  'file-contract': ['#0ea5e9', '#06b6d4'],
  'brain': ['#ec4899', '#f43f5e'],
  'video': ['#f59e0b', '#f97316'],
  'chart-line': ['#10b981', '#14b8a6'],
  'tags': ['#8b5cf6', '#d946ef'],
  'coins': ['#eab308', '#f59e0b'],
};

const SERVICES: Service[] = [
  {
    icon: 'pen-nib',
    title: 'AI Resume Writing',
    description: 'Improve an existing resume or build one from scratch with AI.',
    rate: 'resume_writing',
    note: 'Unlimited with Career Pass.',
    href: '/(candidate)/resume-writing',
  },
  {
    icon: 'file-contract',
    title: 'Employability Report',
    description: "A complete PDF snapshot combining your resume analysis and every assessment you've completed.",
    rate: 'employability_report',
    note: 'Unlimited with Career Pass.',
    href: '/(candidate)/employability-report',
  },
  {
    icon: 'brain',
    title: 'Intro Video Analysis',
    description:
      'Answer an introduction question plus questions drawn from your resume on video, and get a report on your pace, filler words, eye contact, confidence and content.',
    rate: 'video_analysis',
    note: 'Unlimited with Career Pass.',
    href: '/(candidate)/intro-video-analysis',
  },
  {
    icon: 'video',
    title: 'Mock Interview Practice',
    description:
      'Practise with AI-written questions for your target role, answer on video, and get feedback on your speaking, confidence and content. Every interview includes a downloadable report.',
    rate: 'mock_interview',
    href: '/(candidate)/mock-interview',
  },
  {
    icon: 'chart-line',
    title: 'Practice',
    description: 'Every mock interview and intro analysis in one place, with your score trend.',
    href: '/(candidate)/practice',
  },
  {
    icon: 'tags',
    title: 'Plans',
    description: 'Compare Career Pass and the Mock Interview plans side by side.',
    href: '/(candidate)/plans',
  },
  {
    icon: 'coins',
    title: 'My Purchases',
    description: 'See your Career Pass status, coin balance and purchase history — and top up coins or get Career Pass.',
    href: '/(candidate)/my-purchases',
  },
];

export default function PremiumServicesScreen() {
  const theme = useTheme();
  const ratesQuery = useQuery({ queryKey: ['subscription', 'candidate-rates'], queryFn: getCandidateRates });
  const rates = ratesQuery.data?.data;

  return (
    <GradientScreen>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Premium Services" subtitle="Boost your profile" icon="crown" backTo="/(candidate)/profile" colors={['#f59e0b', '#ef4444']} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Paid add-ons that boost your profile — pay with coins as you go, or go unlimited with Career Pass.
        </ThemedText>
        {SERVICES.map((svc) => {
          const rate = svc.rate ? describeRate(rates?.[svc.rate]) : '';
          return (
            <Pressable key={svc.title} onPress={() => router.push(svc.href as never)}>
              <ThemedView style={[styles.card, { borderColor: theme.border, borderLeftColor: COLORS[svc.icon][0], borderLeftWidth: 4 }]}>
                <View style={styles.cardTitleRow}>
                  <LinearGradient colors={COLORS[svc.icon]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
                    <FontAwesome6 name={svc.icon} size={16} color="#fff" />
                  </LinearGradient>
                  <ThemedText style={{ flex: 1, fontWeight: '700' }}>{svc.title}</ThemedText>
                  <FontAwesome6 name="chevron-right" size={12} color={theme.textSecondary} />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {svc.description}
                </ThemedText>
                {rate ? (
                  <ThemedText type="smallBold" style={{ color: '#b45309' }}>
                    {rate}
                    {svc.note ? <ThemedText type="small" themeColor="textSecondary">{`  ·  ${svc.note}`}</ThemedText> : null}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
