import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProfile, updateProfile, uploadAvatar, uploadResume, type ProfileUpdateInput } from '@/lib/api/applicant';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/button';
import { RoleSwitcher } from '@/components/role-switcher';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

interface FormValues {
  full_name: string;
  phone: string;
  location: string;
  summary: string;
  skills: string;
  experience_years: string;
  linkedin_url: string;
  portfolio_url: string;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = profileQuery.data?.data;

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      full_name: '',
      phone: '',
      location: '',
      summary: '',
      skills: '',
      experience_years: '',
      linkedin_url: '',
      portfolio_url: '',
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      location: profile.location ?? '',
      summary: profile.summary ?? '',
      skills: (profile.skills ?? []).join(', '),
      experience_years: profile.experience_years != null ? String(profile.experience_years) : '',
      linkedin_url: profile.linkedin_url ?? '',
      portfolio_url: profile.portfolio_url ?? '',
    });
  }, [profile, reset]);

  const invalidateProfile = () => queryClient.invalidateQueries({ queryKey: ['profile'] });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input: ProfileUpdateInput = {
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        location: values.location.trim(),
        summary: values.summary.trim(),
        skills: values.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        linkedin_url: values.linkedin_url.trim(),
        portfolio_url: values.portfolio_url.trim(),
      };
      const years = Number(values.experience_years);
      if (values.experience_years.trim() && !Number.isNaN(years)) input.experience_years = years;
      return updateProfile(input);
    },
    onSuccess: async () => {
      await invalidateProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save your changes. Please try again.');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: invalidateProfile,
  });

  const resumeMutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: invalidateProfile,
  });

  const onPickAvatar = async () => {
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
    avatarMutation.mutate({ uri: asset.uri, name: asset.fileName ?? 'avatar.jpg', type: asset.mimeType ?? 'image/jpeg' });
  };

  const onPickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    resumeMutation.mutate({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
  };

  const onSubmit = (values: FormValues) => {
    setSaveError(null);
    saveMutation.mutate(values);
  };

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.avatarSection}>
          <Pressable onPress={onPickAvatar} style={styles.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.backgroundElement }]}>
                <FontAwesome6 name="user" size={32} color={theme.textSecondary} />
              </ThemedView>
            )}
            <ThemedView style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
              {avatarMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <FontAwesome6 name="camera" size={12} color="#ffffff" />
              )}
            </ThemedView>
          </Pressable>
          <ThemedText type="smallBold">{authUser?.full_name}</ThemedText>
          <ThemedText themeColor="textSecondary">{authUser?.email}</ThemedText>
        </ThemedView>

        <RoleSwitcher />

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Resume</ThemedText>
          {profile?.resume_url ? (
            <Pressable onPress={() => Linking.openURL(profile.resume_url as string)}>
              <ThemedView style={styles.resumeRow}>
                <FontAwesome6 name="file-lines" size={16} color={theme.primary} />
                <ThemedText type="link" themeColor="primary">
                  View current resume
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : (
            <ThemedText themeColor="textSecondary">No resume uploaded yet.</ThemedText>
          )}
          <Button
            title={profile?.resume_url ? 'Replace resume' : 'Upload resume'}
            variant="secondary"
            icon="file-lines"
            loading={resumeMutation.isPending}
            onPress={onPickResume}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">About you</ThemedText>

          <Controller
            control={control}
            name="full_name"
            render={({ field }) => <TextField label="Full name" value={field.value} onChangeText={field.onChange} />}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <TextField label="Phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="location"
            render={({ field }) => <TextField label="Location" value={field.value} onChangeText={field.onChange} />}
          />
          <Controller
            control={control}
            name="summary"
            render={({ field }) => (
              <TextField
                label="Summary"
                placeholder="A short introduction recruiters will see first"
                multiline
                numberOfLines={4}
                style={styles.multiline}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <TextField
                label="Skills"
                placeholder="Comma-separated, e.g. React Native, TypeScript"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="experience_years"
            render={({ field }) => (
              <TextField
                label="Years of experience"
                keyboardType="numeric"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="linkedin_url"
            render={({ field }) => (
              <TextField
                label="LinkedIn URL"
                autoCapitalize="none"
                keyboardType="url"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="portfolio_url"
            render={({ field }) => (
              <TextField
                label="Portfolio URL"
                autoCapitalize="none"
                keyboardType="url"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />

          {saveError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {saveError}
            </ThemedText>
          ) : null}

          <Button
            title={saved ? 'Saved' : 'Save changes'}
            icon={saved ? 'check' : undefined}
            loading={saveMutation.isPending || formState.isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </ThemedView>

        {profile?.education?.length || profile?.experience?.length ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Education &amp; experience</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Editing this section is coming soon — for now it mirrors what&apos;s on file.
            </ThemedText>
          </ThemedView>
        ) : null}

        <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 20 },
  avatarSection: { alignItems: 'center', gap: 4 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  section: { gap: 12 },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
});
