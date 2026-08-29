import { FontAwesome6 } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobCard } from '@/components/job-card';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getJobsMatchScores, listJobs, listSavedJobs, saveJob, unsaveJob, type JobListItem } from '@/lib/api/jobs';
import { getJobTypes } from '@/lib/api/reference';
import { useAuthStore } from '@/lib/auth/store';

const PAGE_SIZE = 20;
// Once any of the below filters are active, fetch a much larger page and
// filter client-side over it — mirrors web's jobs.js, which fetches its
// entire job list once and filters in memory rather than via backend query
// params (the /dashboard/jobs endpoint only accepts free-text `search`, no
// structured filters). "Education" is deliberately not ported: web's own
// filterEducation reads j.education_qualification, a field the list endpoint
// never returns on either platform, so that filter is a no-op on web too.
const FILTERED_PAGE_SIZE = 200;

const SALARY_BUCKETS = [
  { label: 'Any', value: '' },
  { label: '0–5 LPA', value: '0-5' },
  { label: '5–10 LPA', value: '5-10' },
  { label: '10–20 LPA', value: '10-20' },
  { label: '20+ LPA', value: '20-999' },
];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Salary: High to Low', value: 'salary_high' },
  { label: 'Salary: Low to High', value: 'salary_low' },
];

function sortJobs(jobs: JobListItem[], mode: string): JobListItem[] {
  const sorted = [...jobs];
  if (mode === 'salary_high') {
    sorted.sort((a, b) => (b.salary_max ?? b.salary_min ?? -1) - (a.salary_max ?? a.salary_min ?? -1));
  } else if (mode === 'salary_low') {
    sorted.sort((a, b) => {
      const aVal = a.salary_min ?? a.salary_max;
      const bVal = b.salary_min ?? b.salary_max;
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return aVal - bVal;
    });
  } else {
    sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }
  return sorted;
}

function matchesSalary(job: JobListItem, bucket: string): boolean {
  if (!bucket) return true;
  if (!job.salary_min && !job.salary_max) return false;
  const jobMinLpa = (job.salary_min ?? 0) / 100000;
  const [minStr, maxStr] = bucket.split('-');
  const min = Number(minStr);
  const max = Number(maxStr);
  return jobMinLpa >= min && jobMinLpa <= max;
}

export default function JobsListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSignedIn = useAuthStore((state) => state.status === 'signedIn');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [skillsFilter, setSkillsFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('');
  const [sortMode, setSortMode] = useState('newest');
  const [showingSavedOnly, setShowingSavedOnly] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const jobTypesQuery = useQuery({ queryKey: ['reference', 'job-types'], queryFn: getJobTypes, enabled: filtersOpen });
  const jobTypeOptions = [{ label: 'Any type', value: '' }, ...(jobTypesQuery.data ?? [])];
  const jobTypeLabelById = useMemo(
    () => Object.fromEntries((jobTypesQuery.data ?? []).map((o) => [o.value, o.label])),
    [jobTypesQuery.data],
  );

  const filtersActive = Boolean(skillsFilter || companyFilter || locationFilter || jobTypeFilter || salaryFilter);

  // Loaded whenever signed in (not just while viewing the Saved Jobs toggle)
  // so bookmark icons show the correct state while browsing normally too.
  const savedIdsQuery = useQuery({
    queryKey: ['jobs', 'saved-ids'],
    queryFn: listSavedJobs,
    enabled: isSignedIn,
  });
  const savedJobIds = useMemo(
    () => new Set((savedIdsQuery.data?.data.jobs ?? []).map((j) => j.id)),
    [savedIdsQuery.data],
  );

  const savedJobsQuery = useQuery({
    queryKey: ['jobs', 'saved-list'],
    queryFn: listSavedJobs,
    enabled: showingSavedOnly,
  });

  const toggleSaveMutation = useMutation({
    mutationFn: (job: JobListItem) => (savedJobIds.has(job.id) ? unsaveJob(job.id) : saveJob(job.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved-ids'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved-list'] });
    },
  });

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['jobs', search],
    queryFn: ({ pageParam }) => listJobs({ search: search || undefined, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, page_size, total } = lastPage.data.pagination;
      return page * page_size < total ? page + 1 : undefined;
    },
    enabled: !filtersActive && !showingSavedOnly,
  });

  // Same page fetched once and filtered in memory, mirroring web — see
  // FILTERED_PAGE_SIZE comment above.
  const filteredQuery = useQuery({
    queryKey: ['jobs', 'filtered', search],
    queryFn: () => listJobs({ search: search || undefined, page: 1, pageSize: FILTERED_PAGE_SIZE }),
    enabled: filtersActive && !showingSavedOnly,
  });

  const baseJobs = useMemo(() => {
    if (showingSavedOnly) return savedJobsQuery.data?.data.jobs ?? [];
    return filtersActive
      ? (filteredQuery.data?.data.jobs ?? [])
      : (infiniteQuery.data?.pages.flatMap((page) => page.data.jobs) ?? []);
  }, [showingSavedOnly, savedJobsQuery.data, filtersActive, filteredQuery.data, infiniteQuery.data]);

  const jobs = useMemo(() => {
    let result = baseJobs;
    if (filtersActive && !showingSavedOnly) {
      const skills = skillsFilter.trim().toLowerCase();
      const company = companyFilter.trim().toLowerCase();
      const location = locationFilter.trim().toLowerCase();
      const jobTypeLabel = jobTypeFilter ? (jobTypeLabelById[jobTypeFilter] ?? '').toLowerCase() : '';

      result = baseJobs.filter((job) => {
        if (skills && !(job.skills ?? []).some((s) => s.toLowerCase().includes(skills))) return false;
        if (company && !job.company_name?.toLowerCase().includes(company)) return false;
        if (
          location &&
          !(
            job.location?.toLowerCase().includes(location) ||
            job.location_city?.toLowerCase().includes(location) ||
            job.location_state?.toLowerCase().includes(location)
          )
        )
          return false;
        if (jobTypeLabel && job.job_type?.toLowerCase() !== jobTypeLabel) return false;
        if (!matchesSalary(job, salaryFilter)) return false;
        return true;
      });
    }
    return sortJobs(result, sortMode);
  }, [baseJobs, filtersActive, showingSavedOnly, skillsFilter, companyFilter, locationFilter, jobTypeFilter, jobTypeLabelById, salaryFilter, sortMode]);

  const jobIds = jobs.map((job) => job.id);

  const isLoading = showingSavedOnly ? savedJobsQuery.isLoading : filtersActive ? filteredQuery.isLoading : infiniteQuery.isLoading;
  const isError = showingSavedOnly ? savedJobsQuery.isError : filtersActive ? filteredQuery.isError : infiniteQuery.isError;
  const isRefetching = showingSavedOnly
    ? savedJobsQuery.isRefetching
    : filtersActive
      ? filteredQuery.isRefetching
      : infiniteQuery.isRefetching;
  const refetch = showingSavedOnly ? savedJobsQuery.refetch : filtersActive ? filteredQuery.refetch : infiniteQuery.refetch;

  const clearFilters = () => {
    setSkillsFilter('');
    setCompanyFilter('');
    setLocationFilter('');
    setJobTypeFilter('');
    setSalaryFilter('');
  };

  // Personalized match scores — informational only, never gates applying.
  // Best-effort: query errors (e.g. incomplete profile) just leave badges hidden.
  const matchScoresQuery = useQuery({
    queryKey: ['jobs', 'match-scores', jobIds.join(',')],
    queryFn: () => getJobsMatchScores(jobIds),
    enabled: jobIds.length > 0,
    retry: false,
  });
  const matchScores = matchScoresQuery.data?.data ?? {};

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <FontAwesome6 name="magnifying-glass" size={14} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search jobs or location"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.searchInput,
            { color: theme.text, borderColor: theme.border },
          ]}
        />
      </View>

      <View style={styles.toolbarRow}>
        <Pressable style={styles.filtersToggle} onPress={() => setFiltersOpen((v) => !v)}>
          <FontAwesome6 name="sliders" size={12} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            {filtersOpen ? 'Hide filters' : 'Filters'}
            {filtersActive ? ' (active)' : ''}
          </ThemedText>
          <FontAwesome6 name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={11} color={theme.primary} />
        </Pressable>

        <Pressable
          style={styles.sortToggle}
          onPress={() => {
            const idx = SORT_OPTIONS.findIndex((o) => o.value === sortMode);
            setSortMode(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
          }}
        >
          <FontAwesome6 name="arrow-down-wide-short" size={12} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {SORT_OPTIONS.find((o) => o.value === sortMode)?.label}
          </ThemedText>
        </Pressable>

        {isSignedIn ? (
          <Pressable
            style={styles.sortToggle}
            onPress={() => setShowingSavedOnly((v) => !v)}
          >
            <FontAwesome6 name="bookmark" size={12} color={showingSavedOnly ? theme.primary : theme.textSecondary} />
            <ThemedText type="small" themeColor={showingSavedOnly ? 'primary' : 'textSecondary'}>
              Saved
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {filtersOpen ? (
        <ScrollView contentContainerStyle={[styles.filtersPanel, { borderColor: theme.border }]} style={styles.filtersPanelScroll}>
          <TextField label="Skills" value={skillsFilter} onChangeText={setSkillsFilter} placeholder="e.g. React, SQL" />
          <TextField label="Company" value={companyFilter} onChangeText={setCompanyFilter} />
          <TextField label="Location" value={locationFilter} onChangeText={setLocationFilter} />
          <SelectField label="Employment Type" value={jobTypeFilter} options={jobTypeOptions} onChange={setJobTypeFilter} />
          <SelectField label="Salary Range" value={salaryFilter} options={SALARY_BUCKETS} onChange={setSalaryFilter} />
          {filtersActive ? (
            <Pressable onPress={clearFilters} style={styles.clearFiltersButton}>
              <ThemedText type="small" themeColor="primary">
                Clear filters
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : isError ? (
        <View style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load jobs. Pull down to retry.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push(`/(candidate)/jobs/${item.id}`)}
              matchScore={matchScores[item.id]?.match_score}
              saved={isSignedIn ? savedJobIds.has(item.id) : undefined}
              onToggleSave={isSignedIn ? () => toggleSaveMutation.mutate(item) : undefined}
            />
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!filtersActive && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
              infiniteQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            !filtersActive && infiniteQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} /> : null
          }
          ListEmptyComponent={
            <View style={styles.centerMessage}>
              <ThemedText themeColor="textSecondary">
                {showingSavedOnly ? "You haven't saved any jobs yet." : 'No jobs found.'}
              </ThemedText>
            </View>
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
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  filtersPanelScroll: { maxHeight: 320 },
  filtersPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  clearFiltersButton: { alignSelf: 'flex-start' },
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
