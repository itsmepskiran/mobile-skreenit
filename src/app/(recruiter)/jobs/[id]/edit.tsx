import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobForm } from '@/components/job-form';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { deleteJob, getMyJob, parseSkills, updateJob, type JobInput } from '@/lib/api/recruiter';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const jobQuery = useQuery({ queryKey: ['recruiter', 'job', id], queryFn: () => getMyJob(id) });

  const updateMutation = useMutation({
    mutationFn: (values: Partial<JobInput>) => updateJob(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'job', id] });
      router.back();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save this job posting. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'jobs'] });
      router.replace('/(recruiter)/jobs');
    },
  });

  const confirmDelete = () => {
    Alert.alert('Delete job posting?', 'This will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (jobQuery.isLoading || !jobQuery.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  const job = jobQuery.data.data;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <JobForm
        submitLabel="Save Changes"
        submitting={updateMutation.isPending}
        error={error}
        onDelete={confirmDelete}
        initialValues={{
          job_title: job.job_title,
          department: job.department_id ?? undefined,
          role: job.role_id ?? undefined,
          employment_type: job.employment_type_id ?? undefined,
          job_type: job.job_type_id ?? job.job_type,
          no_of_openings: job.no_of_openings ?? undefined,
          is_remote: job.is_remote,
          location: {
            countryId: job.location_country ?? undefined,
            stateId: job.location_state ?? undefined,
            cityId: job.location_city ?? undefined,
          },
          experience_min: job.experience_min ?? undefined,
          experience_max: job.experience_max ?? undefined,
          salary_min: job.salary_min ?? undefined,
          salary_max: job.salary_max ?? undefined,
          notice_period_days: job.notice_period_days ?? undefined,
          industry: job.industry_id ?? undefined,
          education_qualification: job.education_qualification_id ?? undefined,
          skills: parseSkills(job.skills),
          diversity_hiring: job.diversity_hiring === true || job.diversity_hiring === 'true',
          description: job.description,
          responsibilities: job.responsibilities ?? undefined,
          requirements: job.requirements ?? undefined,
          contact_person_name: job.contact_person_name ?? undefined,
          contact_person_email: job.contact_person_email ?? undefined,
        }}
        onSubmit={(values) => {
          setError(null);
          updateMutation.mutate(values);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
});
