import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Radius } from '@/constants/theme';
import { SelectField } from '@/components/select-field';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import {
  listRecruiterApplications,
  updateApplicationStatus,
  type InterviewResponse,
  type RecruiterApplicationStatus,
} from '@/lib/api/recruiter';
import type { ApplicationStatus } from '@/lib/api/applicant';

const STATUS_OPTIONS: { label: string; value: RecruiterApplicationStatus }[] = [
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
];

// Candidate identity fields (name/email/phone) are sourced from the list
// endpoint, not GET /recruiter/applications/{id} — that detail endpoint has a
// known backend bug returning "Unknown Candidate" / "No email available".
export default function ApplicationReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const applicationsQuery = useQuery({
    queryKey: ['recruiter', 'applications', 'all'],
    queryFn: () => listRecruiterApplications({}),
  });
  const application = applicationsQuery.data?.data.find((app) => app.id === id);

  const [status, setStatus] = useState<RecruiterApplicationStatus | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!status) throw new Error('Select a status first');
      return updateApplicationStatus(id, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason.trim() || undefined : undefined,
        questions:
          status === 'interviewing' || status === 'interview_scheduled'
            ? questionsText
                .split('\n')
                .map((q) => q.trim())
                .filter(Boolean)
            : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'applications'] });
      router.back();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not update this application. Please try again.');
    },
  });

  if (applicationsQuery.isLoading || !application) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  const skills = Array.isArray(application.skills)
    ? application.skills
    : typeof application.skills === 'string'
      ? (() => {
          try {
            return JSON.parse(application.skills as string);
          } catch {
            return [];
          }
        })()
      : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.headerRow}>
          <ThemedView style={styles.headerText}>
            <ThemedText type="subtitle">{application.candidate_name}</ThemedText>
            <ThemedText themeColor="textSecondary">{application.job_title}</ThemedText>
          </ThemedView>
          <StatusBadge status={application.status as ApplicationStatus} />
        </ThemedView>

        <ThemedView style={styles.infoSection}>
          <InfoRow icon="envelope" label={application.candidate_email} />
          <InfoRow icon="phone" label={application.candidate_phone} />
          <InfoRow icon="clock" label={`Applied ${formatRelativeTime(application.applied_at)}`} />
        </ThemedView>

        {skills.length > 0 ? (
          <ThemedView style={styles.skillsRow}>
            {skills.map((skill: string) => (
              <ThemedView key={skill} style={styles.skillChip}>
                <ThemedText type="small" themeColor="primary">
                  {skill}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        ) : null}

        {application.cover_letter ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Cover Letter</ThemedText>
            <ThemedText themeColor="textSecondary">{application.cover_letter}</ThemedText>
          </ThemedView>
        ) : null}

        {application.resume_url ? (
          <Button
            title="View Resume"
            variant="secondary"
            icon="file-lines"
            onPress={() => Linking.openURL(application.resume_url as string)}
          />
        ) : null}

        {application.intro_video_url ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Video Introduction</ThemedText>
            <VideoPlayerBox url={application.intro_video_url} />
          </ThemedView>
        ) : null}

        {application.interview_responses && application.interview_responses.length > 0 ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Interview Responses</ThemedText>
            {application.interview_responses
              .slice()
              .sort((a, b) => a.question_index - b.question_index)
              .map((response) => (
                <InterviewResponseCard key={response.question_index} response={response} />
              ))}
          </ThemedView>
        ) : null}

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Update Status</ThemedText>
          <SelectField
            label="New Status"
            value={status || undefined}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatus(value as RecruiterApplicationStatus)}
            placeholder="Select a status"
          />

          {status === 'rejected' ? (
            <TextField
              label="Rejection reason"
              multiline
              numberOfLines={3}
              style={styles.multiline}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Shared with the candidate"
            />
          ) : null}

          {status === 'interviewing' || status === 'interview_scheduled' ? (
            <TextField
              label="Interview questions (one per line)"
              multiline
              numberOfLines={4}
              style={styles.multiline}
              value={questionsText}
              onChangeText={setQuestionsText}
            />
          ) : null}

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          <Button
            title="Save Status"
            loading={updateMutation.isPending}
            disabled={!status}
            onPress={() => {
              setError(null);
              updateMutation.mutate();
            }}
          />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function VideoPlayerBox({ url }: { url: string }) {
  const theme = useTheme();
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <ThemedView style={[styles.videoBox, { borderColor: theme.border }]}>
      <VideoView player={player} style={styles.video} nativeControls />
    </ThemedView>
  );
}

function InterviewResponseCard({ response }: { response: InterviewResponse }) {
  return (
    <ThemedView style={styles.responseCard}>
      <ThemedText type="small" themeColor="textSecondary">
        {response.question}
      </ThemedText>
      <VideoPlayerBox url={response.video_url} />
    </ThemedView>
  );
}

function InfoRow({ icon, label }: { icon: React.ComponentProps<typeof FontAwesome6>['name']; label: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.infoRow}>
      <FontAwesome6 name={icon} size={13} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 18, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  headerText: { flex: 1, gap: 2 },
  infoSection: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(79,70,229,0.1)',
  },
  section: { gap: 12 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  videoBox: {
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { flex: 1 },
  responseCard: { gap: 8 },
});
