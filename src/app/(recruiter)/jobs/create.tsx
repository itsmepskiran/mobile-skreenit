import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobForm, type JobFormProps } from '@/components/job-form';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { createJob, parseJobDescription, type JobInput } from '@/lib/api/recruiter';
import {
  getDepartments,
  getEducationLevels,
  getEmploymentTypes,
  getIndustries,
  getJobTypes,
  getRoles,
} from '@/lib/api/reference';

// Resolves a JD-extracted free-text label (e.g. "Engineering") to the reference-data
// id JobForm's dropdowns expect, mirroring web's autofillReferenceSelect() — a plain
// case-insensitive match against the option's display name.
function matchReferenceId(options: { label: string; value: string }[] | undefined, rawText?: string): string | undefined {
  if (!rawText || !options) return undefined;
  const needle = rawText.trim().toLowerCase();
  return options.find((o) => o.label.trim().toLowerCase() === needle)?.value;
}

export default function CreateJobScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<JobFormProps['initialValues']>(undefined);

  const departmentsQuery = useQuery({ queryKey: ['reference', 'departments'], queryFn: getDepartments });
  const rolesQuery = useQuery({ queryKey: ['reference', 'roles'], queryFn: getRoles });
  const employmentTypesQuery = useQuery({ queryKey: ['reference', 'employment-types'], queryFn: getEmploymentTypes });
  const industriesQuery = useQuery({ queryKey: ['reference', 'industries'], queryFn: getIndustries });
  const jobTypesQuery = useQuery({ queryKey: ['reference', 'job-types'], queryFn: getJobTypes });
  const educationLevelsQuery = useQuery({ queryKey: ['reference', 'education-levels'], queryFn: getEducationLevels });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'stats'] });
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'dashboard-jobs'] });
      router.replace('/(recruiter)/jobs');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create this job posting. Please try again.');
    },
  });

  const parseMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => parseJobDescription(file),
    onMutate: () => setParseStatus('Analysing JD — extracting job details and auto-filling the form below...'),
    onSuccess: (res) => {
      const jd = res.data;
      if (!jd.available) {
        setParseStatus('Could not extract structured data from this document — please fill the form manually.');
        return;
      }
      const values: JobFormProps['initialValues'] = {
        job_title: jd.job_title,
        department: matchReferenceId(departmentsQuery.data, jd.department),
        role: matchReferenceId(rolesQuery.data, jd.role),
        employment_type: matchReferenceId(employmentTypesQuery.data, jd.employment_type),
        job_type: matchReferenceId(jobTypesQuery.data, jd.job_type),
        industry: matchReferenceId(industriesQuery.data, jd.industry),
        education_qualification: matchReferenceId(educationLevelsQuery.data, jd.education_qualification),
        experience_min: jd.experience_min,
        experience_max: jd.experience_max,
        salary_min: jd.salary_min,
        salary_max: jd.salary_max,
        notice_period_days: jd.notice_period_days,
        is_remote: jd.is_remote,
        diversity_hiring: jd.diversity_hiring,
        responsibilities: jd.responsibilities,
        requirements: jd.requirements,
        contact_person_name: jd.contact_person_name,
        contact_person_email: jd.contact_person_email,
        skills: jd.skills,
        // Location isn't autofilled: jd.location_city/state/country are free-text
        // names, and JobForm's LocationPicker needs resolved location-table ids —
        // resolving those needs a cascading /locations search, deferred for now.
      };
      setInitialValues(values);
      const filledCount = Object.values(values).filter((v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)).length;
      setParseStatus(
        filledCount > 0
          ? `${filledCount} field(s) filled from the JD. Please review before publishing.`
          : 'Extracted the document, but found nothing new to fill in — please complete the form manually.',
      );
    },
    onError: () => setParseStatus('JD parsing failed — please fill the form manually.'),
  });

  const pickJdFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    parseMutation.mutate({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.jdUploadRow}>
        <Pressable style={[styles.jdButton, { borderColor: theme.border }]} onPress={pickJdFile} disabled={parseMutation.isPending}>
          {parseMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <FontAwesome6 name="file-arrow-up" size={13} color={theme.primary} />
          )}
          <ThemedText type="small" themeColor="primary">
            Upload a Job Description to auto-fill this form
          </ThemedText>
        </Pressable>
        {parseStatus ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.jdStatus}>
            {parseStatus}
          </ThemedText>
        ) : null}
      </View>

      <JobForm
        initialValues={initialValues}
        submitLabel="Post Job"
        submitting={createMutation.isPending}
        error={error}
        onSubmit={(values: JobInput) => {
          setError(null);
          createMutation.mutate(values);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  jdUploadRow: { paddingHorizontal: 20, paddingTop: 16, gap: 6 },
  jdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  jdStatus: { textAlign: 'center' },
});
