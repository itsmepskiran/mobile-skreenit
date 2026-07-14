import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listApplications, type ApplicationListItem } from '@/lib/api/applicant';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';

export default function ApplicationsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
  });

  const applications = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Applications</ThemedText>
      </ThemedView>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load your applications. Pull down to retry.</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <ApplicationRow item={item} onPress={() => router.push(`/(candidate)/jobs/${item.job_id}`)} />
          )}
          ListEmptyComponent={
            <ThemedView style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">You haven&apos;t applied to any jobs yet.</ThemedText>
            </ThemedView>
          }
        />
      )}
    </SafeAreaView>
  );
}

function ApplicationRow({ item, onPress }: { item: ApplicationListItem; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" numberOfLines={2}>
        {item.job_title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{item.company_name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {item.location}
      </ThemedText>
      <ThemedView style={styles.statusRow}>
        <StatusBadge status={item.status} />
        <ThemedText type="small" themeColor="textSecondary">
          Applied {formatRelativeTime(item.applied_at)}
        </ThemedText>
      </ThemedView>
      {item.feedback ? (
        <ThemedText type="small" style={styles.feedback}>
          {item.feedback}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 16,
    gap: 6,
  },
  pressed: { opacity: 0.8 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  feedback: {
    fontStyle: 'italic',
  },
});
