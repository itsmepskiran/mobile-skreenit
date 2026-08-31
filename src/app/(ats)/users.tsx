import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AtsFormModal } from '@/components/ats-form-modal';
import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ATS_MODULES,
  ATS_TIER,
  AtsApiError,
  createAtsUser,
  deleteAtsUser,
  listAtsDepartments,
  listAtsUsers,
  updateAtsUser,
  type AtsRightAction,
  type AtsRightsMatrix,
  type AtsRole,
  type AtsUser,
} from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';

const ACTIONS: AtsRightAction[] = ['view', 'create', 'edit', 'delete'];

function moduleLabel(m: string) {
  return m.replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function defaultRights(role: AtsRole): AtsRightsMatrix {
  const full = role === 'super_admin' || role === 'admin';
  const rights: AtsRightsMatrix = {};
  for (const m of ATS_MODULES) rights[m] = { view: true, create: full, edit: full, delete: full };
  return rights;
}

function creatableRoles(callerRole: AtsRole): AtsRole[] {
  return (['admin', 'user'] as AtsRole[]).filter((r) => ATS_TIER[callerRole] > ATS_TIER[r]);
}

export default function AtsUsersScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const currentUser = useAtsStore((state) => state.user);

  const [editing, setEditing] = useState<AtsUser | 'new' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AtsRole>('user');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [rights, setRights] = useState<AtsRightsMatrix>({});
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const usersQuery = useQuery({ queryKey: ['ats', 'users'], queryFn: listAtsUsers });
  const departmentsQuery = useQuery({ queryKey: ['ats', 'departments'], queryFn: listAtsDepartments });
  const departmentOptions = useMemo(
    () => (departmentsQuery.data?.data ?? []).map((d) => ({ label: d.name, value: d.id })),
    [departmentsQuery.data],
  );
  const departmentName = (id: string | null) => (departmentsQuery.data?.data ?? []).find((d) => d.id === id)?.name ?? '—';

  const users = usersQuery.data?.data ?? [];
  const callerRole = currentUser?.role ?? 'user';
  const callerRights = currentUser?.rights ?? {};
  const hasCallerRight = (module: string, action: AtsRightAction) =>
    callerRole === 'super_admin' || !!callerRights?.[module]?.[action];
  const roleOptions = creatableRoles(callerRole).map((r) => ({ label: roleLabel(r), value: r }));

  const canManageRow = (row: AtsUser) => {
    if (row.role === 'super_admin') return false;
    return ATS_TIER[callerRole] > ATS_TIER[row.role] && hasCallerRight('users', 'edit');
  };
  const canDeleteRow = (row: AtsUser) => row.role !== 'super_admin' && ATS_TIER[callerRole] > ATS_TIER[row.role] && hasCallerRight('users', 'delete');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ats', 'users'] });

  const createMutation = useMutation({
    mutationFn: () => createAtsUser({ name: name.trim(), email: email.trim(), role: role as 'admin' | 'user', department_id: departmentId || null, rights }),
    onSuccess: (res) => {
      invalidate();
      setEditing(null);
      if (res.data.generated_password) {
        setCredentials({ email: res.data.email, password: res.data.generated_password });
      }
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => updateAtsUser(id, { name: name.trim(), department_id: departmentId || null, status, rights }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (err) => setError(err instanceof AtsApiError ? err.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAtsUser,
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Could not delete', err instanceof AtsApiError ? err.message : 'Something went wrong'),
  });

  const openCreate = () => {
    const initialRole = roleOptions[0]?.value ?? 'user';
    setName('');
    setEmail('');
    setRole(initialRole);
    setDepartmentId('');
    setStatus('active');
    setRights(defaultRights(initialRole));
    setError(null);
    setEditing('new');
  };

  const openEdit = (u: AtsUser) => {
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setDepartmentId(u.department_id ?? '');
    setStatus(u.status);
    setRights(u.rights ?? defaultRights(u.role));
    setError(null);
    setEditing(u);
  };

  const submit = () => {
    if (!name.trim() || (editing === 'new' && !email.trim())) {
      setError('Name and email are required');
      return;
    }
    if (editing === 'new') createMutation.mutate();
    else if (editing) updateMutation.mutate(editing.id);
  };

  const confirmDelete = (u: AtsUser) => {
    Alert.alert('Delete team member?', `"${u.name}" will lose access immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(u.id) },
    ]);
  };

  const toggleRight = (module: string, action: AtsRightAction) => {
    if (!hasCallerRight(module, action)) return;
    setRights((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module]?.[action] },
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {roleOptions.length > 0 ? (
        <View style={styles.addRow}>
          <Button title="New Team Member" icon="plus" onPress={openCreate} />
        </View>
      ) : null}

      {usersQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {users.map((u) => (
            <ThemedView key={u.id} style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardMain}>
                <ThemedText type="smallBold">{u.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {u.email}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {roleLabel(u.role)} · {departmentName(u.department_id)} · {u.status === 'active' ? 'Active' : 'Inactive'}
                </ThemedText>
              </View>
              {u.role === 'super_admin' ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Managed by Skreenit
                </ThemedText>
              ) : (
                <View style={styles.actions}>
                  {canManageRow(u) ? (
                    <Pressable onPress={() => openEdit(u)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="pen" size={14} color={theme.textSecondary} />
                    </Pressable>
                  ) : null}
                  {canDeleteRow(u) ? (
                    <Pressable onPress={() => confirmDelete(u)} hitSlop={8} style={styles.actionBtn}>
                      <FontAwesome6 name="trash" size={14} color={theme.danger} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            </ThemedView>
          ))}
        </ScrollView>
      )}

      <AtsFormModal
        visible={editing !== null}
        title={editing === 'new' ? 'New Team Member' : 'Edit Team Member'}
        onClose={() => setEditing(null)}
        submitLabel="Save"
        onSubmit={submit}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={error}
      >
        <TextField label="Name" value={name} onChangeText={setName} />
        {editing === 'new' ? (
          <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        ) : (
          <TextField label="Email" value={email} editable={false} />
        )}
        {editing === 'new' ? (
          <SelectField label="Role" value={role} options={roleOptions} onChange={(v) => { setRole(v as AtsRole); setRights(defaultRights(v as AtsRole)); }} />
        ) : (
          <TextField label="Role" value={roleLabel(role)} editable={false} />
        )}
        <SelectField label="Department" value={departmentId} options={departmentOptions} onChange={setDepartmentId} placeholder="— None —" />
        {editing !== 'new' ? (
          <SelectField
            label="Status"
            value={status}
            options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]}
            onChange={(v) => setStatus(v as 'active' | 'inactive')}
          />
        ) : null}

        <ThemedText type="smallBold" style={{ marginTop: 8 }}>
          Permissions
        </ThemedText>
        <View style={{ gap: 10 }}>
          {ATS_MODULES.map((module) => (
            <View key={module} style={[styles.rightsRow, { borderColor: theme.border }]}>
              <ThemedText type="small" style={styles.rightsModule}>
                {moduleLabel(module)}
              </ThemedText>
              <View style={styles.rightsActions}>
                {ACTIONS.map((action) => {
                  const checked = !!rights[module]?.[action];
                  const enabled = hasCallerRight(module, action);
                  return (
                    <Pressable
                      key={action}
                      onPress={() => toggleRight(module, action)}
                      disabled={!enabled}
                      style={styles.rightCell}
                    >
                      <FontAwesome6
                        name={checked ? 'square-check' : 'square'}
                        size={16}
                        color={!enabled ? theme.border : checked ? theme.primary : theme.textSecondary}
                      />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.rightLabel}>
                        {action}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </AtsFormModal>

      <AtsFormModal
        visible={credentials !== null}
        title="Team Member Created"
        onClose={() => setCredentials(null)}
        submitLabel="Done"
        onSubmit={() => setCredentials(null)}
      >
        <ThemedText type="small" themeColor="textSecondary">
          Share these credentials with the new team member. This password will not be shown again.
        </ThemedText>
        <ThemedView style={[styles.credsBox, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Email
          </ThemedText>
          <ThemedText type="smallBold">{credentials?.email}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
            Password
          </ThemedText>
          <ThemedText type="smallBold">{credentials?.password}</ThemedText>
        </ThemedView>
      </AtsFormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  addRow: { paddingHorizontal: 20, paddingTop: 16 },
  list: { padding: 20, gap: 12 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardMain: { flex: 1, gap: 6 },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  actionBtn: { padding: 4 },
  rightsRow: { borderWidth: 1, borderRadius: Radius.md, padding: 10, gap: 8 },
  rightsModule: { fontWeight: '600' },
  rightsActions: { flexDirection: 'row', justifyContent: 'space-between' },
  rightCell: { alignItems: 'center', gap: 4 },
  rightLabel: { textTransform: 'capitalize' },
  credsBox: { borderWidth: 1, borderRadius: Radius.md, padding: 14 },
});
