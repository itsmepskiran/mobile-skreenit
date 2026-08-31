import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AtsFormModal } from '@/components/ats-form-modal';
import { AtsStatusBadge } from '@/components/ats-status-badge';
import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  approveAtsRequisition,
  AtsApiError,
  createAtsRequisition,
  listAtsDepartments,
  listAtsPositions,
  listAtsRequisitions,
  rejectAtsRequisition,
  withdrawAtsRequisition,
  type AtsRequisition,
  type AtsRequisitionStatus,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

const FILTERS: { label: string; value: AtsRequisitionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
];

export default function AtsRequisitionsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const role = useAtsStore((state) => state.user?.role);
  const canManage = role === 'super_admin' || role === 'admin'; // HARD_RESTRICTED_MODULES gate (create)
  const canApprove = role === 'super_admin' || role === 'admin';

  const [statusFilter, setStatusFilter] = useState<AtsRequisitionStatus | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [openingsRequested, setOpeningsRequested] = useState('1');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AtsRequisition | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const requisitionsQuery = useQuery({
    queryKey: ['ats', 'requisitions', statusFilter],
    queryFn: () => listAtsRequisitions(statusFilter === 'all' ? undefined : statusFilter),
  });
  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments, enabled: canManage });
  const positionsQuery = useQuery({ queryKey: ['ats', 'positions'], queryFn: listAtsPositions, enabled: canManage });

  const departmentOptions = useMemo(
    () => (departmentsQuery.data?.data ?? []).map((d) => ({ label: d.name, value: d.id })),
    [departmentsQuery.data],
  );
  const positionOptions = useMemo(() => {
    const positions = positionsQuery.data?.data ?? [];
    return positions
      .filter((p) => !departmentId || p.department_id === departmentId)
      .map((p) => ({ label: `${p.designation_title} (${p.openings - p.filled_count} open)`, value: p.id }));
  }, [positionsQuery.data, departmentId]);

  const requisitions = requisitionsQuery.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ats', 'requisitions'] });

  const createMutation = useMutation({
    mutationFn: () =>
      createAtsRequisition({
        department_id: departmentId,
        position_id: positionId,
        openings_requested: Number(openingsRequested) || 1,
        justification: justification.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setCreating(false);
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const approveMutation = useMutation({
    mutationFn: approveAtsRequisition,
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not approve', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawAtsRequisition,
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not withdraw', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectAtsRequisition(rejecting!.id, reason),
    onSuccess: () => {
      invalidate();
      setRejecting(null);
      setRejectionReason('');
    },
    onError: (err) => setRejectError(err instanceof AtsApiError ? err.message : 'Failed to reject'),
  });

  const openCreate = () => {
    setDepartmentId('');
    setPositionId('');
    setOpeningsRequested('1');
    setJustification('');
    setError(null);
    setCreating(true);
  };

  const submitCreate = () => {
    if (!departmentId || !positionId) {
      setError('Department and position are required');
      return;
    }
    createMutation.mutate();
  };

  const submitReject = () => {
    if (!rejectionReason.trim()) {
      setRejectError('A reason is required');
      return;
    }
    rejectMutation.mutate(rejectionReason.trim());
  };

  const decisionText = (r: AtsRequisition) => {
    if (r.status === 'approved') return `Approved by ${r.approved_by_name ?? '—'}`;
    if (r.status === 'rejected') return `Rejected by ${r.approved_by_name ?? '—'}: ${r.rejection_reason ?? ''}`;
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => {
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
          <Button title="New Requisition" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {requisitionsQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {requisitions.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No requisitions found.
            </ThemedText>
          ) : (
            requisitions.map((r) => {
              const showApproveReject = r.status === 'pending' && canApprove;
              const showWithdraw = r.status === 'pending' && !canApprove;
              const decision = decisionText(r);
              return (
                <ThemedView key={r.id} style={[styles.card, { borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText type="smallBold">{r.designation_title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {r.department_name}
                      </ThemedText>
                    </View>
                    <AtsStatusBadge status={r.status} />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.openings_requested} opening(s) · requested by {r.requested_by_name}
                  </ThemedText>
                  {decision ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {decision}
                    </ThemedText>
                  ) : null}

                  {showApproveReject ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.actionChip, { borderColor: theme.secondary }]}
                        onPress={() => approveMutation.mutate(r.id)}
                      >
                        <FontAwesome6 name="check" size={12} color={theme.secondary} />
                        <ThemedText type="small" style={{ color: theme.secondary }}>
                          Approve
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.actionChip, { borderColor: theme.danger }]}
                        onPress={() => {
                          setRejecting(r);
                          setRejectionReason('');
                          setRejectError(null);
                        }}
                      >
                        <FontAwesome6 name="xmark" size={12} color={theme.danger} />
                        <ThemedText type="small" style={{ color: theme.danger }}>
                          Reject
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                  {showWithdraw ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.actionChip, { borderColor: theme.border }]}
                        onPress={() => withdrawMutation.mutate(r.id)}
                      >
                        <FontAwesome6 name="rotate-left" size={12} color={theme.textSecondary} />
                        <ThemedText type="small" themeColor="textSecondary">
                          Withdraw
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                </ThemedView>
              );
            })
          )}
        </ScrollView>
      )}

      <AtsFormModal
        visible={creating}
        title="New Requisition"
        onClose={() => setCreating(false)}
        submitLabel="Submit Requisition"
        onSubmit={submitCreate}
        submitting={createMutation.isPending}
        error={error}
      >
        <SelectField
          label="Department"
          searchable
          value={departmentId}
          options={departmentOptions}
          onChange={(v) => {
            setDepartmentId(v);
            setPositionId('');
          }}
          placeholder="Select department"
        />
        <SelectField label="Position" searchable value={positionId} options={positionOptions} onChange={setPositionId} placeholder="Select position" />
        <TextField label="Openings Requested" keyboardType="numeric" value={openingsRequested} onChangeText={setOpeningsRequested} />
        <TextField
          label="Justification"
          multiline
          numberOfLines={3}
          style={{ minHeight: 70, textAlignVertical: 'top' }}
          value={justification}
          onChangeText={setJustification}
        />
      </AtsFormModal>

      <AtsFormModal
        visible={rejecting !== null}
        title="Reject Requisition"
        onClose={() => setRejecting(null)}
        submitLabel="Reject"
        onSubmit={submitReject}
        submitting={rejectMutation.isPending}
        error={rejectError}
      >
        <TextField
          label="Reason"
          multiline
          numberOfLines={3}
          style={{ minHeight: 70, textAlignVertical: 'top' }}
          value={rejectionReason}
          onChangeText={setRejectionReason}
          placeholder="Why is this requisition being rejected?"
        />
      </AtsFormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  filterRow: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addRow: { paddingHorizontal: 20, paddingTop: 12 },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', paddingTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
