import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AtsFormModal } from '@/components/ats-form-modal';
import { AtsSearchBar } from '@/components/ats-search-bar';
import { AtsStatusBadge } from '@/components/ats-status-badge';
import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  AtsApiError,
  createAtsJob,
  getAtsJobAssessmentConfig,
  listAtsAssessmentCatalog,
  listAtsJobs,
  listAtsRequisitions,
  putAtsJobAssessmentConfig,
  updateAtsJob,
  type AtsAssessmentSourceType,
  type AtsAssessmentConfigStatus,
  type AtsJob,
  type AtsJobStatus,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

const STATUS_FILTERS: { label: string; value: AtsJobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Open', value: 'open' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Closed', value: 'closed' },
];

const EMPLOYMENT_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship'].map((v) => ({ label: v, value: v }));
const EDIT_STATUS_OPTIONS = STATUS_FILTERS.filter((f) => f.value !== 'all') as { label: string; value: AtsJobStatus }[];
const SOURCE_TYPE_OPTIONS: { label: string; value: AtsAssessmentSourceType }[] = [
  { label: 'Catalog', value: 'catalog' },
  { label: 'Custom', value: 'custom' },
  { label: 'Mixed', value: 'mixed' },
];
const CONFIG_STATUS_OPTIONS: { label: string; value: AtsAssessmentConfigStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

export default function AtsJobsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const role = useAtsStore((state) => state.user?.role);
  const canManage = role === 'super_admin' || role === 'admin';

  const [statusFilter, setStatusFilter] = useState<AtsJobStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [creating, setCreating] = useState(false);
  const [requisitionId, setRequisitionId] = useState('');
  const [title, setTitle] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AtsJob | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<AtsJobStatus>('open');
  const [editError, setEditError] = useState<string | null>(null);

  const [linking, setLinking] = useState<AtsJob | null>(null);
  const [sourceType, setSourceType] = useState<AtsAssessmentSourceType>('catalog');
  const [catalogKey, setCatalogKey] = useState('');
  const [configStatus, setConfigStatus] = useState<AtsAssessmentConfigStatus>('draft');
  const [linkError, setLinkError] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['ats', 'jobs', statusFilter, search],
    queryFn: () => listAtsJobs({ status: statusFilter === 'all' ? undefined : statusFilter, search: search || undefined }),
  });
  const requisitionsQuery = useQuery({
    queryKey: ['ats', 'requisitions', 'approved'],
    queryFn: () => listAtsRequisitions('approved'),
    enabled: canManage && creating,
  });
  const catalogQuery = useQuery({
    queryKey: ['ats', 'assessment-catalog'],
    queryFn: listAtsAssessmentCatalog,
    enabled: linking !== null,
  });
  const configQuery = useQuery({
    queryKey: ['ats', 'jobs', linking?.id, 'assessment-config'],
    queryFn: () => getAtsJobAssessmentConfig(linking!.id),
    enabled: linking !== null,
  });

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!linking) return;
    const config = configQuery.data?.data;
    if (config) {
      setSourceType(config.source_type);
      setCatalogKey(config.catalog_assessment_key ?? '');
      setConfigStatus(config.status);
    } else {
      setSourceType('catalog');
      setCatalogKey('');
      setConfigStatus('draft');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [linking, configQuery.data]);

  const requisitionOptions = useMemo(
    () =>
      (requisitionsQuery.data?.data ?? []).map((r) => ({
        label: `${r.designation_title} — ${r.department_name} (${r.openings_requested} openings)`,
        value: r.id,
      })),
    [requisitionsQuery.data],
  );
  const catalogOptions = useMemo(
    () => (catalogQuery.data?.data ?? []).map((c) => ({ label: c.name, value: c.service_key })),
    [catalogQuery.data],
  );

  const jobs = jobsQuery.data?.data ?? [];

  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ['ats', 'jobs'] });

  const createMutation = useMutation({
    mutationFn: () =>
      createAtsJob({
        requisition_id: requisitionId,
        title: title.trim(),
        employment_type: employmentType || undefined,
        location: location.trim() || undefined,
        salary_min: salaryMin ? Number(salaryMin) : undefined,
        salary_max: salaryMax ? Number(salaryMax) : undefined,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      invalidateJobs();
      setCreating(false);
    },
    onError: (err) => setCreateError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateAtsJob(editing!.id, { title: editTitle.trim(), status: editStatus }),
    onSuccess: () => {
      invalidateJobs();
      setEditing(null);
    },
    onError: (err) => setEditError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const linkMutation = useMutation({
    mutationFn: () =>
      putAtsJobAssessmentConfig(linking!.id, {
        source_type: sourceType,
        catalog_assessment_key: sourceType === 'custom' ? undefined : catalogKey || undefined,
        status: configStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats', 'jobs', linking?.id, 'assessment-config'] });
      setLinking(null);
    },
    onError: (err) => setLinkError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const openCreate = () => {
    setRequisitionId('');
    setTitle('');
    setEmploymentType('Full-time');
    setLocation('');
    setSalaryMin('');
    setSalaryMax('');
    setDescription('');
    setCreateError(null);
    setCreating(true);
  };

  const submitCreate = () => {
    if (!requisitionId || !title.trim()) {
      setCreateError('Requisition and title are required');
      return;
    }
    createMutation.mutate();
  };

  const openEdit = (job: AtsJob) => {
    setEditTitle(job.title);
    setEditStatus(job.status);
    setEditError(null);
    setEditing(job);
  };

  const submitEdit = () => {
    if (!editTitle.trim()) {
      setEditError('Title is required');
      return;
    }
    updateMutation.mutate();
  };

  const submitLink = () => {
    if (sourceType !== 'custom' && !catalogKey) {
      setLinkError('A catalog assessment is required for this source type');
      return;
    }
    linkMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <AtsSearchBar value={searchInput} onChangeText={setSearchInput} placeholder="Search by title, JRF, or Ref No..." />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setStatusFilter(f.value)}
              style={[styles.chip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.backgroundSelected : 'transparent' }]}
            >
              <ThemedText type="small" style={active ? { color: theme.primary, fontWeight: '600' } : undefined}>
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {canManage ? (
        <View style={styles.addRow}>
          <Button title="New Job" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {jobsQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {jobs.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No jobs found.
            </ThemedText>
          ) : (
            jobs.map((job) => (
              <ThemedView key={job.id} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="smallBold">{job.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {job.jrf_number} / {job.reference_no}
                    </ThemedText>
                  </View>
                  <AtsStatusBadge status={job.status} />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {job.department_name ?? '—'} {job.location ? `· ${job.location}` : ''}
                </ThemedText>
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionChip, { borderColor: theme.border }]} onPress={() => setLinking(job)}>
                    <FontAwesome6 name="link" size={12} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Link Assessment
                    </ThemedText>
                  </Pressable>
                  {canManage ? (
                    <Pressable style={[styles.actionChip, { borderColor: theme.border }]} onPress={() => openEdit(job)}>
                      <FontAwesome6 name="pen" size={12} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        Edit
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </ThemedView>
            ))
          )}
        </ScrollView>
      )}

      <AtsFormModal
        visible={creating}
        title="New Job"
        onClose={() => setCreating(false)}
        submitLabel="Create Job"
        onSubmit={submitCreate}
        submitting={createMutation.isPending}
        error={createError}
      >
        <SelectField
          label="Requisition"
          searchable
          value={requisitionId}
          options={requisitionOptions}
          onChange={setRequisitionId}
          placeholder="Select an approved requisition"
        />
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Senior Software Engineer" />
        <SelectField label="Employment Type" value={employmentType} options={EMPLOYMENT_TYPE_OPTIONS} onChange={setEmploymentType} />
        <TextField label="Location" value={location} onChangeText={setLocation} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Min Salary" keyboardType="numeric" value={salaryMin} onChangeText={setSalaryMin} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Max Salary" keyboardType="numeric" value={salaryMax} onChangeText={setSalaryMax} />
          </View>
        </View>
        <TextField
          label="Description"
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
          value={description}
          onChangeText={setDescription}
        />
      </AtsFormModal>

      <AtsFormModal
        visible={editing !== null}
        title="Edit Job"
        onClose={() => setEditing(null)}
        submitLabel="Save"
        onSubmit={submitEdit}
        submitting={updateMutation.isPending}
        error={editError}
      >
        <TextField label="Title" value={editTitle} onChangeText={setEditTitle} />
        <SelectField label="Status" value={editStatus} options={EDIT_STATUS_OPTIONS} onChange={(v) => setEditStatus(v as AtsJobStatus)} />
      </AtsFormModal>

      <AtsFormModal
        visible={linking !== null}
        title="Link Assessment"
        onClose={() => setLinking(null)}
        submitLabel="Save"
        onSubmit={submitLink}
        submitting={linkMutation.isPending}
        error={linkError}
      >
        <SelectField label="Source" value={sourceType} options={SOURCE_TYPE_OPTIONS} onChange={(v) => setSourceType(v as AtsAssessmentSourceType)} />
        {sourceType !== 'custom' ? (
          <SelectField
            label="Catalog Assessment"
            searchable
            value={catalogKey}
            options={catalogOptions}
            onChange={setCatalogKey}
            placeholder="Select an assessment"
          />
        ) : null}
        <SelectField label="Status" value={configStatus} options={CONFIG_STATUS_OPTIONS} onChange={(v) => setConfigStatus(v as AtsAssessmentConfigStatus)} />
      </AtsFormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  filterRow: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addRow: { paddingHorizontal: 20, paddingTop: 12 },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', paddingTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
