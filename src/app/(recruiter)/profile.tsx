import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { HighlightTile } from '@/components/highlight-tile';
import { RoleSwitcher } from '@/components/role-switcher';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import {
    getRecruiterProfile,
    getRecruiterStats,
    updateRecruiterProfile,
    uploadCompanyLogo,
    uploadRecruiterAvatar,
    type RecruiterProfileInput,
} from '@/lib/api/recruiter';
import { useAuthStore } from '@/lib/auth/store';

export default function RecruiterProfileScreen() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({ queryKey: ['recruiter', 'profile'], queryFn: getRecruiterProfile });
  const statsQuery = useQuery({ queryKey: ['recruiter', 'stats'], queryFn: getRecruiterStats });
  const profile = profileQuery.data?.data && 'company_name' in profileQuery.data.data ? profileQuery.data.data : null;
  const stats = statsQuery.data?.data;

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [location, setLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!profile) return;
    setContactName(profile.contact_name ?? '');
    setContactEmail(profile.contact_email ?? '');
    setLocation(profile.location ?? '');
    setCompanyName(profile.company_name ?? '');
    setCompanyWebsite(profile.company_website ?? '');
    setCompanyDescription(profile.company_description ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recruiter', 'profile'] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: RecruiterProfileInput) => updateRecruiterProfile(input),
    onSuccess: () => {
      invalidate();
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save your changes. Please try again.');
    },
  });

  const avatarMutation = useMutation({ mutationFn: uploadRecruiterAvatar, onSuccess: invalidate });
  const logoMutation = useMutation({ mutationFn: uploadCompanyLogo, onSuccess: invalidate });

  const pickImage = async (onPicked: (file: { uri: string; name: string; type: string }) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    onPicked({ uri: asset.uri, name: asset.fileName ?? 'image.jpg', type: asset.mimeType ?? 'image/jpeg' });
  };

  const onSave = () => {
    setError(null);
    saveMutation.mutate({
      contact_name: contactName.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      location: location.trim() || undefined,
      company_name: companyName.trim(),
      company_website: companyWebsite.trim() || undefined,
      company_description: companyDescription.trim() || undefined,
    });
  };

  const onCancelEdit = () => {
    if (!profile) return;
    setContactName(profile.contact_name ?? '');
    setContactEmail(profile.contact_email ?? '');
    setLocation(profile.location ?? '');
    setCompanyName(profile.company_name ?? '');
    setCompanyWebsite(profile.company_website ?? '');
    setCompanyDescription(profile.company_description ?? '');
    setError(null);
    setIsEditing(false);
  };

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  const initial = (companyName || authUser?.full_name || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#4f46e5', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerBanner}>
          <Pressable
            onPress={isEditing ? () => pickImage((f) => avatarMutation.mutate(f)) : undefined}
            disabled={!isEditing}
            style={styles.avatarWrap}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <ThemedText type="title" style={styles.avatarInitial}>
                  {initial}
                </ThemedText>
              </View>
            )}
            {isEditing ? (
              <View style={styles.avatarBadge}>
                {avatarMutation.isPending ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <FontAwesome6 name="camera" size={11} color="#4f46e5" />
                )}
              </View>
            ) : null}
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerName}>
            {authUser?.full_name}
          </ThemedText>
          <ThemedText type="small" style={styles.headerCompany}>
            Company ID: {profile?.company_display_id || 'Pending'}
          </ThemedText>
          {companyName ? (
            <ThemedText style={styles.headerCompany}>
              <FontAwesome6 name="building" size={12} color="#ffffff" /> {companyName}
            </ThemedText>
          ) : null}
          {location ? (
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <FontAwesome6 name="location-dot" size={11} color="#ffffff" />
                <ThemedText type="small" style={styles.badgeText}>
                  {location}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        <ThemedView style={styles.statsRow}>
          <HighlightTile icon="briefcase" label="Jobs Posted" value={String(stats?.total_jobs ?? 0)} colors={['#4facfe', '#00f2fe']} />
          <HighlightTile icon="users" label="Applications" value={String(stats?.total_applications ?? 0)} colors={['#43e97b', '#38f9d7']} />
          <HighlightTile icon="user-check" label="Hired" value={String(stats?.hired ?? 0)} colors={['#f093fb', '#f5576c']} />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeading}>
            <View style={styles.sectionTitleRow}>
              <FontAwesome6 name="building" size={14} color={theme.text} />
              <ThemedText type="smallBold">Company Information</ThemedText>
            </View>
            {!isEditing ? (
              <Pressable style={styles.inlineEditButton} onPress={() => setIsEditing(true)}>
                <FontAwesome6 name="pen-to-square" size={12} color={theme.primary} />
                <ThemedText type="small" themeColor="primary">
                  Edit
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>

          <Pressable
            onPress={isEditing ? () => pickImage((f) => logoMutation.mutate(f)) : undefined}
            disabled={!isEditing}
            style={styles.logoRow}
          >
            {profile?.company_logo_url ? (
              <Image source={{ uri: profile.company_logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder, { backgroundColor: theme.backgroundElement }]}>
                <FontAwesome6 name="image" size={16} color={theme.textSecondary} />
              </View>
            )}
            <ThemedText type="small" themeColor={isEditing ? 'primary' : 'textSecondary'}>
              {isEditing ? (logoMutation.isPending ? 'Uploading...' : 'Change company logo') : 'Company logo'}
            </ThemedText>
          </Pressable>

          {isEditing ? (
            <>
              <TextField label="Company Name" value={companyName} onChangeText={setCompanyName} />
              <TextField label="Contact Name" value={contactName} onChangeText={setContactName} />
              <TextField
                label="Contact Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={contactEmail}
                onChangeText={setContactEmail}
              />
              <TextField
                label="Website"
                autoCapitalize="none"
                keyboardType="url"
                value={companyWebsite}
                onChangeText={setCompanyWebsite}
              />
              <TextField label="Location" value={location} onChangeText={setLocation} />
              <TextField
                label="About Company"
                multiline
                numberOfLines={4}
                style={styles.multiline}
                value={companyDescription}
                onChangeText={setCompanyDescription}
              />
            </>
          ) : (
            <>
              <ReadonlyField label="Company Name" value={companyName} />
              <ReadonlyField label="Contact Name" value={contactName} />
              <ReadonlyField label="Contact Email" value={contactEmail} />
              <ReadonlyField label="Website" value={companyWebsite} />
              <ReadonlyField label="Location" value={location} />
              <ReadonlyField label="About Company" value={companyDescription} />
            </>
          )}

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          {isEditing ? (
            <View style={styles.editActions}>
              <Button title="Cancel" variant="secondary" onPress={onCancelEdit} style={styles.editActionButton} />
              <Button
                title={saved ? 'Saved' : 'Save changes'}
                icon={saved ? 'check' : undefined}
                loading={saveMutation.isPending}
                onPress={onSave}
                style={styles.editActionButton}
              />
            </View>
          ) : null}
        </ThemedView>

        <RoleSwitcher />
        <Button
          title="Purchase History"
          variant="secondary"
          icon="receipt"
          onPress={() => router.push('/(recruiter)/purchase-history')}
        />
        <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.readonlyField, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value.trim() || '-'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 20 },
  headerBanner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#ffffff' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { color: '#ffffff' },
  headerCompany: { color: 'rgba(255,255,255,0.9)' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#ffffff' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 20 },
  section: { gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineEditButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 2 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 10 },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  readonlyField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  editActions: { flexDirection: 'row', gap: 10 },
  editActionButton: { flex: 1 },
});
