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
  AtsApiError,
  createAtsPosition,
  deleteAtsPosition,
  listAtsDepartments,
  listAtsDesignations,
  listAtsPositions,
  updateAtsPosition,
  type AtsPosition,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Closed', value: 'closed' },
];

export default function AtsPositionsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const role = useAtsStore((state) => state.user?.role);
  const canManage = role === 'super_admin' || role === 'admin';

  const [editing, setEditing] = useState<AtsPosition | 'new' | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [openings, setOpenings] = useState('1');
  const [status, setStatus] = useState('open');
  const [error, setError] = useState<string | null>(null);

  const positionsQuery = useQuery({ queryKey: ['ats', 'positions'], queryFn: listAtsPositions });
  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments, enabled: canManage });
  const designationsQuery = useQuery({ queryKey: ['ats', 'designations'], queryFn: listAtsDesignations, enabled: canManage });

  const departmentOptions = useMemo(
    () => (departmentsQuery.data?.data ?? []).map((d) => ({ label: d.name, value: d.id })),
    [departmentsQuery.data],
  );
  const designationOptions = useMemo(
    () =>
      (designationsQuery.data?.data ?? []).map((d) => ({
        label: d.level ? `${d.title} (${d.level})` : d.title,
        value: d.id,
      })),
    [designationsQuery.data],
  );

  const positions = positionsQuery.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ats', 'positions'] });

  const createMutation = useMutation({
    mutationFn: () =>
      createAtsPosition({ department_id: departmentId, designation_id: designationId, openings: Number(openings) || 1 }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      updateAtsPosition(id, {
        department_id: departmentId,
        designation_id: designationId,
        openings: Number(openings) || 1,
        status: status as 'open' | 'on_hold' | 'closed',
      }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAtsPosition,
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not delete', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const openCreate = () => {
    setDepartmentId('');
    setDesignationId('');
    setOpenings('1');
    setStatus('open');
    setError(null);
    setEditing('new');
  };

  const openEdit = (pos: AtsPosition) => {
    setDepartmentId(pos.department_id);
    setDesignationId(pos.designation_id);
    setOpenings(String(pos.openings));
    setStatus(pos.status);
    setError(null);
    setEditing(pos);
  };

  const closeModal = () => setEditing(null);

  const submit = () => {
    if (!departmentId || !designationId) {
      setError('Department and designation are required');
      return;
    }
    if (editing === 'new') createMutation.mutate();
    else if (editing) updateMutation.mutate(editing.id);
  };

  const confirmDelete = (pos: AtsPosition) => {
    Alert.alert('Delete position?', `"${pos.designation_title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(pos.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {canManage ? (
        <View style={styles.addRow}>
          <Button title="Add Position" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {positionsQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {positions.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No positions found.
            </ThemedText>
          ) : (
            positions.map((pos) => (
              <ThemedView key={pos.id} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardMain}>
                  <ThemedText type="smallBold">{pos.designation_title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {pos.department_name} · {pos.filled_count}/{pos.openings} filled
                  </ThemedText>
                  <AtsStatusBadge status={pos.status} />
                </View>
                {canManage ? (
                  <View style={styles.actions}>
                    <Pressable onPress={() => openEdit(pos)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="pen" size={14} color={theme.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(pos)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="trash" size={14} color={theme.danger} />
                    </Pressable>
                  </View>
                ) : null}
              </ThemedView>
            ))
          )}
        </ScrollView>
      )}

      <AtsFormModal
        visible={editing !== null}
        title={editing === 'new' ? 'New Position' : 'Edit Position'}
        onClose={closeModal}
        submitLabel="Save Position"
        onSubmit={submit}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={error}
      >
        <SelectField label="Department" searchable value={departmentId} options={departmentOptions} onChange={setDepartmentId} placeholder="Select department" />
        <SelectField label="Designation" searchable value={designationId} options={designationOptions} onChange={setDesignationId} placeholder="Select designation" />
        <TextField label="Openings" keyboardType="numeric" value={openings} onChangeText={setOpenings} />
        {editing !== 'new' ? <SelectField label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} /> : null}
      </AtsFormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  addRow: { paddingHorizontal: 20, paddingTop: 16 },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', paddingTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardMain: { flex: 1, gap: 6 },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  actionBtn: { padding: 4 },
});
