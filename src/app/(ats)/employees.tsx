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
  createAtsEmployee,
  deleteAtsEmployee,
  listAtsDepartments,
  listAtsEmployees,
  listAtsPositions,
  updateAtsEmployee,
  type AtsEmployee,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

const STATUS_FILTERS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'On Leave', value: 'on-leave' },
];
const EDIT_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'On Leave', value: 'on-leave' },
];

export default function AtsEmployeesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const role = useAtsStore((state) => state.user?.role);
  const canManage = role === 'super_admin' || role === 'admin'; // employees is HARD_RESTRICTED_MODULES on the backend

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editing, setEditing] = useState<AtsEmployee | 'new' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);

  const employeesQuery = useQuery({ queryKey: ['ats', 'employees'], queryFn: listAtsEmployees });
  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments });
  const positionsQuery = useQuery({ queryKey: ['ats', 'positions'], queryFn: listAtsPositions, enabled: canManage });

  const departmentOptions = useMemo(
    () => (departmentsQuery.data?.data ?? []).map((d) => ({ label: d.name, value: d.id })),
    [departmentsQuery.data],
  );
  const positionOptions = useMemo(
    () => (positionsQuery.data?.data ?? []).map((p) => ({ label: p.designation_title, value: p.id })),
    [positionsQuery.data],
  );
  const departmentName = (id: string | null) => (departmentsQuery.data?.data ?? []).find((d) => d.id === id)?.name ?? '—';
  const positionTitle = (id: string | null) => (positionsQuery.data?.data ?? []).find((p) => p.id === id)?.designation_title ?? '—';

  const filtered = useMemo(() => {
    let rows = employeesQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((e) => e.name.toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q));
    if (departmentFilter) rows = rows.filter((e) => e.department_id === departmentFilter);
    if (statusFilter) rows = rows.filter((e) => e.status === statusFilter);
    return rows;
  }, [employeesQuery.data, search, departmentFilter, statusFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ats', 'employees'] });

  const createMutation = useMutation({
    mutationFn: () =>
      createAtsEmployee({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        department_id: departmentId || null,
        position_id: positionId || null,
        start_date: startDate || null,
      }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      updateAtsEmployee(id, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        department_id: departmentId || null,
        position_id: positionId || null,
        start_date: startDate || null,
        status: status as 'active' | 'on-leave' | 'inactive',
      }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAtsEmployee,
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not delete', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const openCreate = () => {
    setName('');
    setEmail('');
    setPhone('');
    setDepartmentId('');
    setPositionId('');
    setStartDate('');
    setStatus('active');
    setError(null);
    setEditing('new');
  };

  const openEdit = (emp: AtsEmployee) => {
    setName(emp.name);
    setEmail(emp.email ?? '');
    setPhone(emp.phone ?? '');
    setDepartmentId(emp.department_id ?? '');
    setPositionId(emp.position_id ?? '');
    setStartDate(emp.start_date ?? '');
    setStatus(emp.status);
    setError(null);
    setEditing(emp);
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

  const confirmDelete = (emp: AtsEmployee) => {
    Alert.alert('Delete employee?', `"${emp.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(emp.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <AtsSearchBar value={search} onChangeText={setSearch} placeholder="Search employees…" />

      <View style={styles.filtersRow}>
        <View style={{ flex: 1 }}>
          <SelectField label="Department" value={departmentFilter} options={[{ label: 'All departments', value: '' }, ...departmentOptions]} onChange={setDepartmentFilter} />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField label="Status" value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />
        </View>
      </View>

      {canManage ? (
        <View style={styles.addRow}>
          <Button title="Add Employee" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {employeesQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No employees found. Try adjusting your search or add a new employee.
            </ThemedText>
          ) : (
            filtered.map((emp) => (
              <ThemedView key={emp.id} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardMain}>
                  <ThemedText type="smallBold">{emp.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {departmentName(emp.department_id)} · {positionTitle(emp.position_id)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {emp.email ?? '—'} {emp.phone ? `· ${emp.phone}` : ''}
                  </ThemedText>
                  <AtsStatusBadge status={emp.status} />
                </View>
                {canManage ? (
                  <View style={styles.actions}>
                    <Pressable onPress={() => openEdit(emp)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="pen" size={14} color={theme.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(emp)} hitSlop={8} style={styles.actionBtn}>
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
        title={editing === 'new' ? 'New Employee' : 'Edit Employee'}
        onClose={closeModal}
        submitLabel="Save Employee"
        onSubmit={submit}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={error}
      >
        <TextField label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Priya Shah" />
        <SelectField label="Department" value={departmentId} options={departmentOptions} onChange={setDepartmentId} placeholder="Select department" />
        <SelectField label="Position" value={positionId} options={positionOptions} onChange={setPositionId} placeholder="Select position" />
        <TextField label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        {editing !== 'new' ? <SelectField label="Status" value={status} options={EDIT_STATUS_OPTIONS} onChange={setStatus} /> : null}
        <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="name@company.com" />
        <TextField label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 90000 00000" />
      </AtsFormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  filtersRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  addRow: { paddingHorizontal: 20, paddingTop: 4 },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', paddingTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardMain: { flex: 1, gap: 6 },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  actionBtn: { padding: 4 },
});
