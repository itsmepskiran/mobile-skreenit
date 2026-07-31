import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listApplications, type ApplicationListItem } from '@/lib/api/applicant';
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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="title">Applications</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <View style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load your applications. Pull down to retry.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <ApplicationRow
              item={item}
              onPress={() => router.push(`/(candidate)/jobs/${item.job_id}`)}
              onRecordInterview={() => router.push(`/(candidate)/interview-room/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">You haven&apos;t applied to any jobs yet.</ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function ApplicationRow({
  item,
  onPress,
  onRecordInterview,
}: {
  item: ApplicationListItem;
  onPress: () => void;
  onRecordInterview: () => void;
}) {
  const theme = useTheme();
  const canRecordInterview = item.status === 'interview_scheduled' || item.status === 'interviewing';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.border },
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
      <View style={styles.statusRow}>
        <StatusBadge status={item.status} />
        <ThemedText type="small" themeColor="textSecondary">
          Applied {formatRelativeTime(item.applied_at)}
        </ThemedText>
      </View>
      {item.feedback ? (
        <ThemedText type="small" style={styles.feedback}>
          {item.feedback}
        </ThemedText>
      ) : null}
      {canRecordInterview ? (
        <Pressable style={[styles.recordButton, { backgroundColor: theme.primary }]} onPress={onRecordInterview}>
          <FontAwesome6 name="video" size={12} color="#fff" />
          <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
            Record Interview Responses
          </ThemedText>
        </Pressable>
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
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: 10,
    marginTop: 6,
  },
});
