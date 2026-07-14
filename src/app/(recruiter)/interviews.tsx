import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';
import { listRecruiterApplications } from '@/lib/api/recruiter';
import type { ApplicationStatus } from '@/lib/api/applicant';

const PENDING_STATUSES = new Set(['interview_scheduled', 'interviewing']);

// Filtered view of the same GET /recruiter/applications endpoint used by the
// Applications Received tab — the backend has no dedicated interviews endpoint.
export default function PendingInterviewsScreen() {
  const theme = useTheme();

  const applicationsQuery = useQuery({
    queryKey: ['recruiter', 'applications', 'all'],
    queryFn: () => listRecruiterApplications({}),
  });

  const pending = (applicationsQuery.data?.data ?? []).filter((app) => PENDING_STATUSES.has(app.status));

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
        <ThemedText type="title">Pending Interviews</ThemedText>

        {pending.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No interviews pending right now.
          </ThemedText>
        ) : (
          pending.map((app) => (
            <Pressable
              key={app.id}
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onPress={() => router.push(`/(recruiter)/applications/${app.id}`)}
            >
              <ThemedView style={styles.cardHeader}>
                <ThemedView style={styles.cardText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {app.candidate_name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {app.job_title}
                  </ThemedText>
                </ThemedView>
                <StatusBadge status={app.status as ApplicationStatus} />
              </ThemedView>
              <ThemedView style={styles.footerRow}>
                <FontAwesome6 name="clock" size={11} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Applied {formatRelativeTime(app.applied_at)}
                </ThemedText>
              </ThemedView>
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
  content: { padding: 20, gap: 14 },
  empty: { textAlign: 'center', marginTop: 40 },
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
