import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { cardSurface } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';

// Default landing tab for recruiters (see roleHome in src/app/_layout.tsx) —
// these tools (resume analysis, candidate search, interview scheduling, JD
// writer, premium assessments, analysis reports) are the primary reason a
// recruiter opens the app day-to-day, ahead of the stats-focused Dashboard.
export default function AtsServicesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="ATS Services" subtitle="Tools to run your hiring pipeline" icon="toolbox" colors={['#4f46e5', '#7c3aed']} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.atsGrid}>
          <AtsServiceCard
            icon="file-lines"
            label="Analyse Resumes"
            onPress={() => router.push('/(recruiter)/resume-analysis')}
          />
          <AtsServiceCard
            icon="magnifying-glass"
            label="Candidate Search"
            onPress={() => router.push('/(recruiter)/candidate-search')}
          />
          <AtsServiceCard
            icon="calendar-days"
            label="Interview Schedules"
            onPress={() => router.push('/(recruiter)/interviews-calendar')}
          />
          <AtsServiceCard icon="file-pen" label="JD Section" onPress={() => router.push('/(recruiter)/jd-writer')} />
          <AtsServiceCard
            icon="crown"
            label="Premium Services"
            onPress={() => router.push('/(recruiter)/premium')}
          />
          <AtsServiceCard
            icon="chart-simple"
            label="Analysis Reports"
            onPress={() => router.push('/(recruiter)/analysis-reports')}
          />
          <AtsServiceCard
            icon="chart-pie"
            label="Reports"
            onPress={() => router.push('/(recruiter)/reports')}
          />
          <AtsServiceCard
            icon="star"
            label="Featured Jobs"
            onPress={() => router.push('/(recruiter)/featured-jobs')}
          />
          <AtsServiceCard
            icon="file-invoice-dollar"
            label="Billing & Plan"
            onPress={() => router.push('/(recruiter)/billing')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ICON_COLORS: Record<string, readonly [string, string]> = {
  'file-lines': ['#6366f1', '#8b5cf6'],
  'magnifying-glass': ['#0ea5e9', '#06b6d4'],
  'calendar-days': ['#10b981', '#14b8a6'],
  'file-pen': ['#f59e0b', '#f97316'],
  'crown': ['#eab308', '#f59e0b'],
  'chart-simple': ['#ec4899', '#f43f5e'],
  'chart-pie': ['#8b5cf6', '#d946ef'],
  'star': ['#f97316', '#ef4444'],
  'file-invoice-dollar': ['#14b8a6', '#2563eb'],
};

function AtsServiceCard({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useBaseTheme();
  return (
    <Pressable style={[styles.atsCard, cardSurface(theme), { borderColor: theme.border }]} onPress={onPress}>
      <LinearGradient colors={ICON_COLORS[icon] ?? ['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.atsIcon}>
        <FontAwesome6 name={icon} size={20} color="#ffffff" />
      </LinearGradient>
      <ThemedText type="smallBold" style={styles.atsLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, gap: 20 },
  atsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  atsCard: {
    flexBasis: '48%',
    flexGrow: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  atsIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  atsLabel: { textAlign: 'center' },
});
