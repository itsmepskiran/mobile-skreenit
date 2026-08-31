import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  createAtsDepartment,
  deleteAtsDepartment,
  listAtsDepartments,
  listAtsUsers,
  updateAtsDepartment,
  type AtsDepartment,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

export default function AtsDepartmentsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const role = useAtsStore((state) => state.user?.role);
  const canManage = role === 'super_admin' || role === 'admin';

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AtsDepartment | 'new' | null>(null);
  const [name, setName] = useState('');
  const [headUserId, setHeadUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments });
  const usersQuery = useQuery({ queryKey: ['ats', 'users'], queryFn: listAtsUsers, enabled: canManage });

  const headOptions = useMemo(
    () => (usersQuery.data?.data ?? []).map((u) => ({ label: u.name, value: u.id })),
    [usersQuery.data],
  );
  const headName = (id: string | null) => (usersQuery.data?.data ?? []).find((u) => u.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const rows = departmentsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) => d.name.toLowerCase().includes(q));
  }, [departmentsQuery.data, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ats', 'departments'] });

  const createMutation = useMutation({
    mutationFn: () => createAtsDepartment({ name: name.trim(), head_user_id: headUserId || null }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => updateAtsDepartment(id, { name: name.trim(), head_user_id: headUserId || null }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAtsDepartment,
    onSuccess: invalidate,
    onError: (err) =>
      Alert.alert('Could not delete', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const openCreate = () => {
    setName('');
    setHeadUserId('');
    setError(null);
    setEditing('new');
  };

  const openEdit = (dept: AtsDepartment) => {
    setName(dept.name);
    setHeadUserId(dept.head_user_id ?? '');
    setError(null);
    setEditing(dept);
  };

  const closeModal = () => setEditing(null);

  const submit = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (editing === 'new') createMutation.mutate();
    else if (editing) updateMutation.mutate(editing.id);
  };

  const confirmDelete = (dept: AtsDepartment) => {
    Alert.alert('Delete department?', `"${dept.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(dept.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <AtsSearchBar value={search} onChangeText={setSearch} placeholder="Search departments…" />

      {canManage ? (
        <View style={styles.addRow}>
          <Button title="Add Department" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {departmentsQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No departments found.
            </ThemedText>
          ) : (
            filtered.map((dept) => (
              <ThemedView key={dept.id} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardMain}>
                  <ThemedText type="smallBold">{dept.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Head: {headName(dept.head_user_id)}
                  </ThemedText>
                  <AtsStatusBadge status={dept.status} />
                </View>
                {canManage ? (
                  <View style={styles.actions}>
                    <Pressable onPress={() => openEdit(dept)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="pen" size={14} color={theme.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(dept)} hitSlop={8} style={styles.actionBtn}>
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
        title={editing === 'new' ? 'New Department' : 'Edit Department'}
        onClose={closeModal}
        submitLabel="Save Department"
        onSubmit={submit}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={error}
      >
        <TextField label="Name" placeholder="e.g. Engineering" value={name} onChangeText={setName} />
        <SelectField
          label="Head"
          searchable
          value={headUserId}
          options={headOptions}
          onChange={setHeadUserId}
          placeholder="— None —"
        />
      </AtsFormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  addRow: { paddingHorizontal: 20, paddingTop: 12 },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', paddingTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardMain: { flex: 1, gap: 6 },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  actionBtn: { padding: 4 },
});
