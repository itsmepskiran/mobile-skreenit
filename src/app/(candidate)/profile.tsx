import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { RoleSwitcher } from '@/components/role-switcher';
import { Stepper, type StepDefinition } from '@/components/stepper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api/client';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadResume,
  type CandidateProfile,
  type ProfileUpdateInput,
} from '@/lib/api/applicant';
import { EMPTY_WIZARD_VALUES, type WizardValues } from '@/components/profile-wizard/types';
import { StepPersonal } from '@/components/profile-wizard/step-personal';
import { StepProfessional } from '@/components/profile-wizard/step-professional';
import { StepEducation } from '@/components/profile-wizard/step-education';
import { StepSkills } from '@/components/profile-wizard/step-skills';
import { StepExperience } from '@/components/profile-wizard/step-experience';
import { StepReview } from '@/components/profile-wizard/step-review';
import { StepVideoIntro } from '@/components/profile-wizard/step-video-intro';

const STEPS: StepDefinition[] = [
  { label: 'Personal', icon: 'user' },
  { label: 'Professional', icon: 'briefcase' },
  { label: 'Education', icon: 'graduation-cap' },
  { label: 'Skills', icon: 'code' },
  { label: 'Experience', icon: 'clock-rotate-left' },
  { label: 'Review', icon: 'check' },
  { label: 'Video Intro', icon: 'video' },
];
const REVIEW_STEP = 5;
const VIDEO_STEP = 6;

function toStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// Saving an empty date string (e.g. current_dol left blank) round-trips as
// the MySQL zero-date sentinel "0000-00-00 00:00:00" rather than null.
function toDateStr(value: unknown): string {
  const str = toStr(value);
  return str.startsWith('0000-00-00') ? '' : str.slice(0, 10);
}

function fromProfile(profile: CandidateProfile): WizardValues {
  return {
    ...EMPTY_WIZARD_VALUES,
    phone: profile.phone ?? '',
    date_of_birth: toDateStr(profile.date_of_birth),
    gender: profile.gender ?? '',
    marital_status: profile.marital_status ?? '',
    current_address: profile.current_address ?? '',
    current_city: profile.current_city ?? '',
    current_state: profile.current_state ?? '',
    current_country: profile.current_country ?? '',
    permanent_address: profile.permanent_address ?? '',
    permanent_city: profile.permanent_city ?? '',
    permanent_state: profile.permanent_state ?? '',
    permanent_country: profile.permanent_country ?? '',
    current_salary: toStr(profile.current_salary),
    expected_salary: toStr(profile.expected_salary),
    notice_period_days: toStr(profile.notice_period_days),
    highest_qualification: profile.highest_qualification ?? '',
    linkedin_url: profile.linkedin_url ?? '',
    portfolio_url: profile.portfolio_url ?? '',
    personal_projects: profile.personal_projects ?? '',
    personal_blogs: profile.personal_blogs ?? '',
    summary: profile.summary ?? '',
    schooling: profile.schooling ?? '',
    schooling_year: toStr(profile.schooling_year),
    schooling_percentage: toStr(profile.schooling_percentage),
    pre_university: profile.pre_university ?? '',
    pre_university_year: toStr(profile.pre_university_year),
    pre_university_percentage: toStr(profile.pre_university_percentage),
    graduation: profile.graduation ?? '',
    graduation_year: toStr(profile.graduation_year),
    graduation_percentage: toStr(profile.graduation_percentage),
    post_graduation: profile.post_graduation ?? '',
    post_graduation_year: toStr(profile.post_graduation_year),
    post_graduation_percentage: toStr(profile.post_graduation_percentage),
    education: profile.education ?? [],
    certifications: profile.certifications ?? [],
    skills: profile.skills ?? [],
    spoken_languages: profile.spoken_languages?.length ? profile.spoken_languages : ['english'],
    current_company: profile.current_company ?? '',
    current_designation: profile.current_designation ?? '',
    current_doj: toDateStr(profile.current_doj),
    current_dol: toDateStr(profile.current_dol),
    experience: profile.experience ?? [],
  };
}

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<WizardValues>(EMPTY_WIZARD_VALUES);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = profileQuery.data?.data;

  useEffect(() => {
    if (profile) setValues(fromProfile(profile));
  }, [profile]);

  const setValue = <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const invalidateProfile = () => queryClient.invalidateQueries({ queryKey: ['profile'] });

  const saveMutation = useMutation({
    mutationFn: (input: ProfileUpdateInput) => updateProfile(input),
    onSuccess: async () => {
      await invalidateProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save your changes. Please try again.');
    },
  });

  const avatarMutation = useMutation({ mutationFn: uploadAvatar, onSuccess: invalidateProfile });
  const resumeMutation = useMutation({ mutationFn: uploadResume, onSuccess: invalidateProfile });

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

  const onSave = () => {
    setSaveError(null);
    const input: ProfileUpdateInput = {
      phone: values.phone.trim() || undefined,
      date_of_birth: values.date_of_birth.trim() || undefined,
      gender: values.gender || undefined,
      marital_status: values.marital_status || undefined,
      current_address: values.current_address.trim() || undefined,
      current_city: values.current_city.trim() || undefined,
      current_state: values.current_state.trim() || undefined,
      current_country: values.current_country.trim() || undefined,
      permanent_address: (values.sameAsCurrent ? values.current_address : values.permanent_address).trim() || undefined,
      permanent_city: (values.sameAsCurrent ? values.current_city : values.permanent_city).trim() || undefined,
      permanent_state: (values.sameAsCurrent ? values.current_state : values.permanent_state).trim() || undefined,
      permanent_country: (values.sameAsCurrent ? values.current_country : values.permanent_country).trim() || undefined,
      current_salary: toNumberOrUndefined(values.current_salary),
      expected_salary: toNumberOrUndefined(values.expected_salary),
      notice_period_days: toNumberOrUndefined(values.notice_period_days),
      highest_qualification: values.highest_qualification || undefined,
      linkedin_url: values.linkedin_url.trim() || undefined,
      portfolio_url: values.portfolio_url.trim() || undefined,
      personal_projects: values.personal_projects.trim() || undefined,
      personal_blogs: values.personal_blogs.trim() || undefined,
      summary: values.summary.trim() || undefined,
      schooling: values.schooling.trim() || undefined,
      schooling_year: toNumberOrUndefined(values.schooling_year),
      schooling_percentage: values.schooling_percentage.trim() || undefined,
      pre_university: values.pre_university.trim() || undefined,
      pre_university_year: toNumberOrUndefined(values.pre_university_year),
      pre_university_percentage: values.pre_university_percentage.trim() || undefined,
      graduation: values.graduation.trim() || undefined,
      graduation_year: toNumberOrUndefined(values.graduation_year),
      graduation_percentage: values.graduation_percentage.trim() || undefined,
      post_graduation: values.post_graduation.trim() || undefined,
      post_graduation_year: toNumberOrUndefined(values.post_graduation_year),
      post_graduation_percentage: values.post_graduation_percentage.trim() || undefined,
      spoken_languages: values.spoken_languages,
      certifications: values.certifications.filter((c) => c.name || c.issuer || c.year),
      current_company: values.current_company.trim() || undefined,
      current_designation: values.current_designation.trim() || undefined,
      current_doj: values.current_doj.trim() || undefined,
      current_dol: values.current_dol.trim() || undefined,
      experience: values.experience.filter((e) => e.job_title || e.company),
      education: values.education.filter((e) => e.degree || e.institution),
      skills: values.skills,
    };
    saveMutation.mutate(input);
  };

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const stepProps = { values, setValue };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stepper steps={STEPS} activeIndex={stepIndex} />
      <ScrollView contentContainerStyle={styles.content}>
        {stepIndex === 0 ? (
          <StepPersonal
            {...stepProps}
            fullName={authUser?.full_name ?? ''}
            email={authUser?.email ?? ''}
            avatarUrl={profile?.avatar_url ?? null}
            resumeUrl={profile?.resume_url ?? null}
            avatarUploading={avatarMutation.isPending}
            resumeUploading={resumeMutation.isPending}
            onPickAvatar={onPickAvatar}
            onPickResume={onPickResume}
          />
        ) : null}
        {stepIndex === 1 ? <StepProfessional {...stepProps} /> : null}
        {stepIndex === 2 ? <StepEducation {...stepProps} /> : null}
        {stepIndex === 3 ? <StepSkills {...stepProps} /> : null}
        {stepIndex === 4 ? <StepExperience {...stepProps} /> : null}
        {stepIndex === REVIEW_STEP ? (
          <>
            <StepReview values={values} fullName={authUser?.full_name ?? ''} email={authUser?.email ?? ''} />
            <Button
              title={saved ? 'Saved' : 'Save Profile'}
              icon={saved ? 'check' : undefined}
              loading={saveMutation.isPending}
              onPress={onSave}
            />
            <RoleSwitcher />
            <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
          </>
        ) : null}
        {stepIndex === VIDEO_STEP ? (
          <StepVideoIntro
            resumeUrl={profile?.resume_url ?? null}
            existingIntroVideoUrl={profile?.intro_video_url ?? null}
            onRecorded={invalidateProfile}
          />
        ) : null}

        {saveError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {saveError}
          </ThemedText>
        ) : null}
      </ScrollView>

      <ThemedView style={[styles.footer, { borderColor: theme.border }]}>
        <Pressable
          disabled={isFirstStep}
          onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
          style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
        >
          <FontAwesome6 name="chevron-left" size={13} color={isFirstStep ? theme.border : theme.text} />
          <ThemedText style={isFirstStep ? { color: theme.border } : undefined}>Back</ThemedText>
        </Pressable>

        {isLastStep ? null : (
          <Pressable style={styles.navButton} onPress={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}>
            <ThemedText themeColor="primary">Next</ThemedText>
            <FontAwesome6 name="chevron-right" size={13} color={theme.primary} />
          </Pressable>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  navButtonDisabled: { opacity: 0.4 },
});
