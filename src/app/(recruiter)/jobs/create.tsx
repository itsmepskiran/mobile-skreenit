import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobForm } from '@/components/job-form';
import { ApiError } from '@/lib/api/client';
import { createJob } from '@/lib/api/recruiter';

export default function CreateJobScreen() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <JobForm
        submitLabel="Post Job"
        submitting={createMutation.isPending}
        error={error}
        onSubmit={(values) => {
          setError(null);
          createMutation.mutate(values);
        }}
      />
    </SafeAreaView>
  );
}
