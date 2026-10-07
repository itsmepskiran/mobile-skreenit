import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { Radius, cardSurface } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ApplicationStatus } from '@/lib/api/applicant';
import { listRecruiterApplications } from '@/lib/api/recruiter';
import { formatRelativeTime } from '@/lib/format';
import { withBackTo } from '@/lib/navigation/smart-back';

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
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Pending Interviews" subtitle="Candidates waiting for your review" icon="video" colors={['#ec4899', '#8b5cf6']} />
      <ScrollView contentContainerStyle={styles.content}>
        
        {pending.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No interviews pending right now.
          </ThemedText>
        ) : (
          pending.map((app) => (
            <Pressable
              key={app.id}
              style={[styles.card, cardSurface(theme), { borderColor: theme.border }]}
              onPress={() => router.push(withBackTo(`/(recruiter)/applications/${app.id}`, '/(recruiter)/interviews'))}
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
