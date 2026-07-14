import { FontAwesome6 } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listJobs } from '@/lib/api/jobs';
import { JobCard } from '@/components/job-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 20;

export default function JobsListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['jobs', search],
      queryFn: ({ pageParam }) => listJobs({ search: search || undefined, page: pageParam, pageSize: PAGE_SIZE }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const { page, page_size, total } = lastPage.data.pagination;
        return page * page_size < total ? page + 1 : undefined;
      },
    });

  const jobs = data?.pages.flatMap((page) => page.data.jobs) ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.searchWrap}>
        <FontAwesome6 name="magnifying-glass" size={14} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search jobs or location"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />
      </ThemedView>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load jobs. Pull down to retry.</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => router.push(`/(candidate)/jobs/${item.id}`)} />
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} /> : null}
          ListEmptyComponent={
            <ThemedView style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">No jobs found.</ThemedText>
            </ThemedView>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchIcon: {
    position: 'absolute',
    left: 30,
    top: 26,
    zIndex: 1,
  },
  searchInput: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingLeft: 36,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loader: {
    marginTop: 40,
  },
  footerLoader: {
    marginVertical: 16,
  },
  centerMessage: {
    padding: 40,
    alignItems: 'center',
  },
});
