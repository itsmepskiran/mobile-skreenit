import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ApplicationStatus } from '@/lib/api/applicant';
import { listRecruiterApplications } from '@/lib/api/recruiter';
import { formatRelativeTime } from '@/lib/format';

export default function RecruiterApplicationsScreen() {
  const theme = useTheme();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();

  const applicationsQuery = useQuery({
    queryKey: ['recruiter', 'applications', jobId ?? 'all'],
    queryFn: () => listRecruiterApplications({ jobId }),
  });

  const applications = applicationsQuery.data?.data ?? [];

  if (applicationsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {jobId ? (
          <View style={[styles.filterBanner, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Showing applicants for this job only
            </ThemedText>
            <Pressable onPress={() => router.setParams({ jobId: undefined })}>
              <ThemedText type="small" themeColor="primary">
                Clear
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {applications.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No applications yet.
          </ThemedText>
        ) : (
          applications.map((app) => (
            <Pressable
              key={app.id}
              style={[styles.card, { borderColor: theme.border }]}
              onPress={() => router.push(`/(recruiter)/applications/${app.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {app.candidate_name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {app.job_title}
                  </ThemedText>
                </View>
                <StatusBadge status={app.status as ApplicationStatus} />
              </View>
              <View style={styles.footerRow}>
                <FontAwesome6 name="clock" size={11} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Applied {formatRelativeTime(app.applied_at)}
                </ThemedText>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardText: { flex: 1, gap: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
