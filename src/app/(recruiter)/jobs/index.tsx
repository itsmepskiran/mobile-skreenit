import { FontAwesome6 } from '@expo/vector-icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteJob, listMyJobs, parseSkills, type RecruiterJobListItem } from '@/lib/api/recruiter';
import { JOB_DETAILS_URL } from '@/lib/config';
import { formatSalaryRange } from '@/lib/format';

function jobUrl(jobId: string) {
  return `${JOB_DETAILS_URL}?job_id=${jobId}`;
}

type StatusFilter = 'all' | 'active' | 'closed' | 'draft';

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: 'Active', bg: '#dcfce7', fg: '#166534' },
  closed: { label: 'Closed', bg: '#fee2e2', fg: '#991b1b' },
  draft: { label: 'Draft', bg: '#f1f5f9', fg: '#475569' },
};

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Draft', value: 'draft' },
];

export default function MyJobsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [qrJob, setQrJob] = useState<RecruiterJobListItem | null>(null);

  // Debounced, same pattern as the candidate jobs list (src/app/(candidate)/jobs/index.tsx).
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // `search` is sent to the backend (matches job_title, JRF Number, or Reference No across this
  // recruiter's ENTIRE job set, not just one fetched page) — a client-side filter over a capped
  // page can never find an older posting once a recruiter has more jobs than that page size.
  const jobsQuery = useQuery({
    queryKey: ['recruiter', 'jobs', search],
    queryFn: () => listMyJobs({ pageSize: 50, search: search || undefined }),
    // Keep showing the previous results while a new search term is in flight, instead of
    // blanking the whole screen (incl. the search box) back to a full-page spinner on every keystroke.
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'jobs'] }),
  });

  const filtered = useMemo(() => {
    const jobs = jobsQuery.data?.data.jobs ?? [];
    if (statusFilter === 'all') return jobs;
    return jobs.filter((job) => job.status === statusFilter);
  }, [jobsQuery.data?.data.jobs, statusFilter]);

  const confirmDelete = (job: RecruiterJobListItem) => {
    Alert.alert('Delete job posting?', `"${job.job_title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(job.id) },
    ]);
  };

  if (jobsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[styles.searchRow, { borderColor: theme.border }]}>
        <FontAwesome6 name="magnifying-glass" size={14} color={theme.textSecondary} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by title, JRF, or Ref No..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = filter.value === statusFilter;
            return (
              <Pressable
                key={filter.value}
                onPress={() => setStatusFilter(filter.value)}
                style={[
                  styles.filterChip,
                  { borderColor: theme.border },
                  active && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
              >
                <ThemedText type="small" style={{ color: active ? '#ffffff' : theme.text }}>
                  {filter.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No jobs match this filter.
          </ThemedText>
        ) : (
          filtered.map((job) => {
            const statusStyle = STATUS_STYLE[job.status] ?? STATUS_STYLE.draft;
            const skills = parseSkills(job.skills).slice(0, 4);
            const salary = formatSalaryRange(job.salary_min, job.salary_max, 'INR');

            return (
              <View key={job.id} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {job.job_title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      JRF: {job.jrf_number || '—'} &middot; Ref: {job.reference_no || '—'}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <ThemedText type="small" style={{ color: statusStyle.fg, fontWeight: '600' }}>
                      {statusStyle.label}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => setQrJob(job)}
                    style={[styles.qrThumb, { borderColor: theme.border }]}
                    hitSlop={6}
                  >
                    <QRCode value={jobUrl(job.id)} size={44} />
                  </Pressable>
                </View>

                <View style={styles.metaGrid}>
                  {job.location ? (
                    <View style={styles.metaItem}>
                      <FontAwesome6 name="location-dot" size={11} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {job.is_remote ? 'Remote' : job.location}
                      </ThemedText>
                    </View>
                  ) : null}
                  {salary ? (
                    <View style={styles.metaItem}>
                      <FontAwesome6 name="sack-dollar" size={11} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {salary}
                      </ThemedText>
                    </View>
                  ) : null}
                  {job.experience_min != null ? (
                    <View style={styles.metaItem}>
                      <FontAwesome6 name="briefcase" size={11} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {job.experience_min}-{job.experience_max ?? job.experience_min} yrs
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                {skills.length > 0 ? (
                  <View style={styles.skillsRow}>
                    {skills.map((skill) => (
                      <View key={skill} style={styles.skillChip}>
                        <ThemedText type="small" themeColor="primary">
                          {skill}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionButton, { borderColor: theme.border }]}
                    onPress={() => router.push(`/(recruiter)/applications?jobId=${job.id}`)}
                  >
                    <FontAwesome6 name="users" size={13} color={theme.primary} />
                    <ThemedText type="small" themeColor="primary">
                      Applicants
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { borderColor: theme.border }]}
                    onPress={() => router.push(`/(recruiter)/jobs/${job.id}/edit`)}
                  >
                    <FontAwesome6 name="pen-to-square" size={13} color={theme.text} />
                    <ThemedText type="small">Edit</ThemedText>
                  </Pressable>
                  <Pressable style={[styles.actionButton, { borderColor: theme.border }]} onPress={() => confirmDelete(job)}>
                    <FontAwesome6 name="trash" size={13} color={theme.danger} />
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      Delete
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={qrJob != null} transparent animationType="fade" onRequestClose={() => setQrJob(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setQrJob(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            {qrJob ? (
              <>
                <ThemedText type="smallBold" style={styles.modalTitle} numberOfLines={2}>
                  {qrJob.job_title}
                </ThemedText>
                <View style={styles.modalQrBox}>
                  <QRCode value={jobUrl(qrJob.id)} size={220} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.modalHint}>
                  Scan to view or apply to this job
                </ThemedText>
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.actionButton, { borderColor: theme.border }]}
                    onPress={() => Share.share({ message: jobUrl(qrJob.id), url: jobUrl(qrJob.id) })}
                  >
                    <FontAwesome6 name="share-nodes" size={13} color={theme.primary} />
                    <ThemedText type="small" themeColor="primary">
                      Share link
                    </ThemedText>
                  </Pressable>
                  <Pressable style={[styles.actionButton, { borderColor: theme.border }]} onPress={() => setQrJob(null)}>
                    <ThemedText type="small">Close</ThemedText>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterContainer: { paddingTop: 0, paddingBottom: 8 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 4, gap: 8, alignItems: 'center' },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: 20, paddingTop: 4, gap: 14 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  qrThumb: { borderWidth: 1, borderRadius: Radius.sm, padding: 4 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(79,70,229,0.1)',
  },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 9,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.lg,
    padding: 20,
    gap: 14,
    alignItems: 'center',
  },
  modalTitle: { textAlign: 'center' },
  modalQrBox: { padding: 12, backgroundColor: '#fff', borderRadius: Radius.md },
  modalHint: { textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
});
