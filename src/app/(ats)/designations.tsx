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
  createAtsDesignation,
  deleteAtsDesignation,
  listAtsDesignations,
  updateAtsDesignation,
  type AtsDesignation,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

// Web offers these 4 as a closed dropdown, but `level` is a free-form string
// server-side (models/ats_models.py's AtsDesignationCreate) — not enforced.
const LEVEL_OPTIONS = [
  { label: 'Entry', value: 'Entry' },
  { label: 'Mid', value: 'Mid' },
  { label: 'Senior', value: 'Senior' },
  { label: 'Lead', value: 'Lead' },
];

export default function AtsDesignationsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const role = useAtsStore((state) => state.user?.role);
  const canManage = role === 'super_admin' || role === 'admin';

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AtsDesignation | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const designationsQuery = useQuery({ queryKey: ['ats', 'designations'], queryFn: listAtsDesignations });

  const filtered = useMemo(() => {
    const rows = designationsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) => d.title.toLowerCase().includes(q) || (d.level ?? '').toLowerCase().includes(q));
  }, [designationsQuery.data, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ats', 'designations'] });

  const createMutation = useMutation({
    mutationFn: () => createAtsDesignation({ title: title.trim(), level: level || null, description: description.trim() || null }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      updateAtsDesignation(id, { title: title.trim(), level: level || null, description: description.trim() || null }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAtsDesignation,
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not delete', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const openCreate = () => {
    setTitle('');
    setLevel('');
    setDescription('');
    setError(null);
    setEditing('new');
  };

  const openEdit = (des: AtsDesignation) => {
    setTitle(des.title);
    setLevel(des.level ?? '');
    setDescription(des.description ?? '');
    setError(null);
    setEditing(des);
  };

  const closeModal = () => setEditing(null);

  const submit = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (editing === 'new') createMutation.mutate();
    else if (editing) updateMutation.mutate(editing.id);
  };

  const confirmDelete = (des: AtsDesignation) => {
    Alert.alert('Delete designation?', `"${des.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(des.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <AtsSearchBar value={search} onChangeText={setSearch} placeholder="Search designations…" />

      {canManage ? (
        <View style={styles.addRow}>
          <Button title="Add Designation" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {designationsQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No designations found.
            </ThemedText>
          ) : (
            filtered.map((des) => (
              <ThemedView key={des.id} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardMain}>
                  <ThemedText type="smallBold">{des.title}</ThemedText>
                  {des.level ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {des.level}
                    </ThemedText>
                  ) : null}
                  {des.description ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {des.description}
                    </ThemedText>
                  ) : null}
                  <AtsStatusBadge status={des.status} />
                </View>
                {canManage ? (
                  <View style={styles.actions}>
                    <Pressable onPress={() => openEdit(des)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="pen" size={14} color={theme.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(des)} hitSlop={8} style={styles.actionBtn}>
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
        title={editing === 'new' ? 'New Designation' : 'Edit Designation'}
        onClose={closeModal}
        submitLabel="Save Designation"
        onSubmit={submit}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={error}
      >
        <TextField label="Title" placeholder="e.g. Software Engineer" value={title} onChangeText={setTitle} />
        <SelectField label="Level" value={level} options={LEVEL_OPTIONS} onChange={setLevel} placeholder="— None —" />
        <TextField
          label="Description"
          multiline
          numberOfLines={3}
          style={{ minHeight: 70, textAlignVertical: 'top' }}
          value={description}
          onChangeText={setDescription}
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
