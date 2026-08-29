import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bulkAnalyzeResponses } from '@/lib/api/analytics';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ApplicationStatus } from '@/lib/api/applicant';
import {
  listRecruiterApplications,
  updateApplicationStatus,
  type RecruiterApplicationStatus,
} from '@/lib/api/recruiter';
import { formatRelativeTime } from '@/lib/format';

// Mirrors web's application-list.js filter set (status dropdown + name/email
// search, both applied client-side over one fetched list — web has no bulk
// status-update endpoint either, so this app also just fires the existing
// single-status endpoint once per selected candidate, same as web's
// bulk-schedule-interview action does).
const STATUS_FILTER_OPTIONS = [
  { label: 'Any status', value: '' },
  { label: 'Applied', value: 'submitted' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Interview Submitted', value: 'responses_submitted' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
];

const BULK_STATUS_OPTIONS: { label: string; value: RecruiterApplicationStatus }[] = [
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
];

export default function RecruiterApplicationsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const applicationsQuery = useQuery({
    queryKey: ['recruiter', 'applications', jobId ?? 'all'],
    queryFn: () => listRecruiterApplications({ jobId }),
  });

  const allApplications = useMemo(() => applicationsQuery.data?.data ?? [], [applicationsQuery.data]);

  const applications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApplications.filter((app) => {
      if (statusFilter && app.status !== statusFilter) return false;
      if (
        q &&
        !(
          app.candidate_name?.toLowerCase().includes(q) ||
          app.candidate_email?.toLowerCase().includes(q) ||
          app.job_title?.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [allApplications, search, statusFilter]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: RecruiterApplicationStatus) => {
      setBulkBusy(true);
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await updateApplicationStatus(id, { status });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'applications'] });
      setBulkStatusModalOpen(false);
      setBulkBusy(false);
      exitSelectMode();
    },
    onError: () => {
      setBulkBusy(false);
      Alert.alert('Could not update all selected applications', 'Please try again.');
    },
  });

  const bulkAnalyzeMutation = useMutation({
    mutationFn: () => bulkAnalyzeResponses(Array.from(selectedIds), jobId),
    onSuccess: () => {
      Alert.alert('Analysis started', 'Video responses are being analyzed in the background — check Analysis Reports shortly.');
      exitSelectMode();
    },
    onError: () => {
      Alert.alert('Could not start analysis', 'Please try again.');
    },
  });

  if (applicationsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.searchRow, { borderColor: theme.border }]}>
        <FontAwesome6 name="magnifying-glass" size={14} color={theme.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by candidate name or email..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.statusSelectWrap}>
          <SelectField label="Status" value={statusFilter} options={STATUS_FILTER_OPTIONS} onChange={setStatusFilter} />
        </View>
        <Pressable
          style={[styles.selectToggle, { borderColor: theme.border }, selectMode && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          <ThemedText type="small" style={{ color: selectMode ? '#ffffff' : theme.text }}>
            {selectMode ? 'Cancel' : 'Select'}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {jobId ? (
          <View style={[styles.filterBanner, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Showing applicants for this job only
            </ThemedText>
            <Pressable onPress={() => router.setParams({ jobId: undefined })}>
              <ThemedText type="small" themeColor="primary">
                Clear
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {applications.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No applications match these filters.
          </ThemedText>
        ) : (
          applications.map((app) => {
            // Prefer the automatic resume/JD match_score; fall back to the
            // on-demand ai_score if a recruiter already triggered it.
            const score = typeof app.match_score === 'number' ? app.match_score : app.ai_score;
            const scoreColor = score === null || score === undefined
              ? theme.textSecondary
              : score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
            const selected = selectedIds.has(app.id);

            return (
              <Pressable
                key={app.id}
                style={[styles.card, { borderColor: theme.border }, selected && { borderColor: theme.primary }]}
                onPress={() => (selectMode ? toggleSelected(app.id) : router.push(`/(recruiter)/applications/${app.id}`))}
              >
                <View style={styles.cardHeader}>
                  {selectMode ? (
                    <FontAwesome6
                      name={selected ? 'square-check' : 'square'}
                      size={18}
                      color={selected ? theme.primary : theme.textSecondary}
                      style={styles.checkbox}
                    />
                  ) : null}
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
                  {score !== null && score !== undefined ? (
                    <ThemedText type="small" style={{ color: scoreColor, marginLeft: 'auto', fontWeight: '600' }}>
                      Match {score}%
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selectMode && selectedIds.size > 0 ? (
        <View style={[styles.bulkBar, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedIds.size} selected
          </ThemedText>
          <View style={styles.bulkActions}>
            <Pressable
              style={[styles.bulkButton, { borderColor: theme.border }]}
              onPress={() => setBulkStatusModalOpen(true)}
            >
              <ThemedText type="small">Update Status</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.bulkButton, { backgroundColor: theme.primary }]}
              onPress={() => bulkAnalyzeMutation.mutate()}
              disabled={bulkAnalyzeMutation.isPending}
            >
              {bulkAnalyzeMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  Analyze Responses
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={bulkStatusModalOpen} transparent animationType="fade" onRequestClose={() => setBulkStatusModalOpen(false)}>
        <Pressable style={styles.modalScrim} onPress={() => setBulkStatusModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Update status for {selectedIds.size} application{selectedIds.size === 1 ? '' : 's'}
            </ThemedText>
            {BULK_STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.modalOption, { borderColor: theme.border }]}
                disabled={bulkBusy}
                onPress={() => bulkStatusMutation.mutate(opt.value)}
              >
                <ThemedText type="small">{opt.label}</ThemedText>
              </Pressable>
            ))}
            {bulkBusy ? <ActivityIndicator color={theme.primary} style={{ marginTop: 8 }} /> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, paddingTop: 8, gap: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingBottom: 4 },
  statusSelectWrap: { flex: 1 },
  selectToggle: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  checkbox: { marginTop: 2 },
  cardText: { flex: 1, gap: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bulkActions: { flexDirection: 'row', gap: 10 },
  bulkButton: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 9, borderColor: 'transparent' },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: Radius.lg, padding: 20, gap: 8 },
  modalTitle: { marginBottom: 6 },
  modalOption: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
});
