import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchaseHistoryRow } from '@/components/purchase-history-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { getPurchaseHistory } from '@/lib/api/subscription';

// Hidden Tabs.Screen sibling (href: null) linked from Profile — same
// cross-tab back-history gap as notifications.tsx, so navigate explicitly
// rather than router.back().
export function PurchaseHistoryScreen({ backTo }: { backTo: Href }) {
  const theme = useTheme();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['subscription', 'history'],
    queryFn: getPurchaseHistory,
  });

  const purchases = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.replace(backTo)} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Purchase History</ThemedText>
      </ThemedView>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load purchase history. Pull down to retry.</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.subscription_id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => <PurchaseHistoryRow item={item} />}
          ListEmptyComponent={
            <ThemedView style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">No purchases yet.</ThemedText>
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
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  listContent: { padding: 20 },
});
