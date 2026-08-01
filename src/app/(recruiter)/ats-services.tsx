import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// Default landing tab for recruiters (see roleHome in src/app/_layout.tsx) —
// these tools (resume analysis, candidate search, interview scheduling, JD
// writer, premium assessments, analysis reports) are the primary reason a
// recruiter opens the app day-to-day, ahead of the stats-focused Dashboard.
export default function AtsServicesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">ATS Services</ThemedText>
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
            label="Premium (Assessments)"
            onPress={() => router.push('/(recruiter)/premium')}
          />
          <AtsServiceCard
            icon="chart-simple"
            label="Analysis Reports"
            onPress={() => router.push('/(recruiter)/analysis-reports')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AtsServiceCard({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.atsCard, { borderColor: theme.border }]} onPress={onPress}>
      <View style={[styles.atsIcon, { backgroundColor: theme.backgroundElement }]}>
        <FontAwesome6 name={icon} size={20} color={theme.primary} />
      </View>
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
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  atsIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  atsLabel: { textAlign: 'center' },
});
