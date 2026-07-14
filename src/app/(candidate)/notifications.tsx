import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listNotifications, markAllAsRead, markAsRead } from '@/lib/api/notifications';
import { NotificationRow } from '@/components/notification-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export default function NotificationsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  // No push infra exists server-side yet — poll while this screen is mounted.
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ limit: 50 }),
    refetchInterval: 30000,
  });

  const notifications = data?.data.notifications ?? [];
  const hasUnread = notifications.some((n) => !n.read);

  const markOneMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Notifications</ThemedText>
        {hasUnread ? (
          <Pressable onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <ThemedText type="link" themeColor="primary">
              Mark all read
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load notifications. Pull down to retry.</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={() => {
                if (!item.read) markOneMutation.mutate(item.id);
              }}
            />
          )}
          ListEmptyComponent={
            <ThemedView style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">Nothing yet.</ThemedText>
            </ThemedView>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  listContent: { padding: 12 },
});
