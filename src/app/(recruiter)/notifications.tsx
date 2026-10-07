import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, BackHandler, FlatList, StyleSheet } from 'react-native';
import { Pressable } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listNotifications, markAllAsRead, markAsRead } from '@/lib/api/notifications';
import { NotificationRow } from '@/components/notification-row';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

// Mirrors (candidate)/notifications.tsx — this screen is a hidden sibling
// Tabs.Screen (href: null in _layout.tsx), not nested in a Stack under the
// Dashboard tab that pushes to it — Expo Router's Tabs navigator has no
// cross-tab back history, so both the Android hardware back button and a
// plain router.back() fall through to the tab bar's first screen instead of
// returning to Dashboard. Navigate explicitly both from a header back button
// and by intercepting hardware back.
function goBackToDashboard() {
  router.replace('/(recruiter)/dashboard');
}

export default function RecruiterNotificationsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackToDashboard();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Notifications" subtitle="Updates on your hiring" icon="bell" backTo="/(recruiter)/dashboard" colors={['#6366f1', '#ec4899']} right={hasUnread ? (<Pressable onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Mark all read
            </ThemedText>
          </Pressable>) : null} />

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  listContent: { padding: 12 },
});
