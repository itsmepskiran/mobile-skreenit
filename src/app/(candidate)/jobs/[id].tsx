import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { applyToJob, checkApplicationStatus } from '@/lib/api/applicant';
import { ApiError } from '@/lib/api/client';
import { getJob, getJobMatchScore, listSavedJobs, saveJob, unsaveJob } from '@/lib/api/jobs';
import { Button } from '@/components/button';
import { HighlightTile } from '@/components/highlight-tile';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';
import { useSmartBack } from '@/lib/navigation/smart-back';

export default function JobDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Pushed here from Applications and Dashboard (outside this stack) as well
  // as Jobs' own list (this stack's index) — see src/lib/navigation/smart-back.ts.
  const { backTo, goBack } = useSmartBack();
  const headerBackOverride = backTo
    ? {
        headerLeft: () => (
          <Pressable onPress={goBack} hitSlop={12} style={{ paddingRight: 12 }}>
            <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
          </Pressable>
        ),
      }
    : {};
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [coverLetterModalVisible, setCoverLetterModalVisible] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  const jobQuery = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id) });
  const statusQuery = useQuery({
    queryKey: ['applicationStatus', id],
    queryFn: () => checkApplicationStatus(id),
  });
  // Personalized resume/JD match score — informational only, never gates
  // applying. Best-effort: an error (e.g. incomplete profile) just hides the tile.
  const matchScoreQuery = useQuery({
    queryKey: ['jobMatchScore', id],
    queryFn: () => getJobMatchScore(id),
    retry: false,
  });
  // Same query key as (candidate)/jobs/index.tsx's saved-ids query — React
  // Query dedupes/shares the cache, so this doesn't refetch if the list
  // screen already loaded it.
  const savedIdsQuery = useQuery({ queryKey: ['jobs', 'saved-ids'], queryFn: listSavedJobs });
  const isSaved = (savedIdsQuery.data?.data.jobs ?? []).some((j) => j.id === id);

  const toggleSaveMutation = useMutation({
    mutationFn: () => (isSaved ? unsaveJob(id) : saveJob(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved-ids'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved-list'] });
    },
  });

  const job = jobQuery.data?.data;
  const applicationStatus = statusQuery.data?.data;
  const matchScore = matchScoreQuery.data?.data?.match_score;

  // Matches sql-skreenit's detailed-application-form.html: an optional cover-letter
  // text area plus a declaration checkbox gate the submission.
  const onApply = async () => {
    setApplyError(null);
    setApplying(true);
    try {
      await applyToJob(id, coverLetter.trim() || undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applicationStatus', id] }),
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
      ]);
      setCoverLetterModalVisible(false);
      setCoverLetter('');
      setDeclarationAgreed(false);
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === 'string' && err.detail.includes('Already applied')) {
        // Backend state and our cached status disagree — resync rather than show a scary error.
        await queryClient.invalidateQueries({ queryKey: ['applicationStatus', id] });
        setCoverLetterModalVisible(false);
      } else {
        setApplyError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  if (jobQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={headerBackOverride} />
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={headerBackOverride} />
        <ThemedView style={styles.centerMessage}>
          <ThemedText themeColor="textSecondary">Couldn&apos;t load this job.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const salary = formatSalaryRange(job.salary_min, job.salary_max, job.currency);
  const experienceRange =
    job.experience_min != null || job.experience_max != null
      ? `${job.experience_min ?? 0}-${job.experience_max ?? job.experience_min} yrs`
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: job.job_title, ...headerBackOverride }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.titleText}>
              {job.job_title}
            </ThemedText>
            <Pressable onPress={() => toggleSaveMutation.mutate()} hitSlop={10} disabled={toggleSaveMutation.isPending}>
              <FontAwesome6 name="bookmark" size={20} color={isSaved ? theme.primary : theme.textSecondary} />
            </Pressable>
          </ThemedView>
          <ThemedText themeColor="primary">{job.company_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            JRF: {job.jrf_number || '—'} &middot; Ref: {job.reference_no || '—'}
          </ThemedText>
          <ThemedView style={styles.metaRow}>
            <FontAwesome6 name="location-dot" size={12} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {job.is_remote ? 'Remote' : job.location}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              &middot; Posted {formatRelativeTime(job.created_at)}
            </ThemedText>
          </ThemedView>
          {salary ? (
            <ThemedText type="small" themeColor="textSecondary">
              {salary}
            </ThemedText>
          ) : null}
        </ThemedView>

        {/* Matches sql-skreenit's job-details.html "Job Highlights" 8-tile grid (7 here — the
            public detail endpoint doesn't surface no_of_openings). */}
        <ThemedView style={styles.highlightsGrid}>
          {matchScore !== undefined ? (
            <HighlightTile
              icon="bullseye"
              label="Your Match Score"
              value={`${matchScore}%`}
              colors={['#16a34a', '#059669']}
            />
          ) : null}
          {job.department ? (
            <HighlightTile icon="building" label="Department" value={job.department} colors={['#667eea', '#764ba2']} />
          ) : null}
          {job.role ? (
            <HighlightTile icon="user-tag" label="Role" value={job.role} colors={['#f093fb', '#f5576c']} />
          ) : null}
          {job.employment_type ? (
            <HighlightTile
              icon="clock"
              label="Employment Type"
              value={job.employment_type}
              colors={['#4facfe', '#00f2fe']}
            />
          ) : null}
          {experienceRange ? (
            <HighlightTile icon="chart-line" label="Experience" value={experienceRange} colors={['#fa709a', '#fee140']} />
          ) : null}
          {job.notice_period_days != null ? (
            <HighlightTile
              icon="calendar-days"
              label="Notice Period"
              value={`${job.notice_period_days} days`}
              colors={['#a8edea', '#fed6e3']}
              iconColor="#333333"
            />
          ) : null}
          {job.industry ? (
            <HighlightTile icon="industry" label="Industry" value={job.industry} colors={['#667eea', '#764ba2']} />
          ) : null}
          {job.education_qualification ? (
            <HighlightTile
              icon="graduation-cap"
              label="Education"
              value={job.education_qualification}
              colors={['#f093fb', '#f5576c']}
            />
          ) : null}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Description</ThemedText>
          <ThemedText>{job.description}</ThemedText>
        </ThemedView>

        {job.requirements ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Requirements</ThemedText>
            <ThemedText>{job.requirements}</ThemedText>
          </ThemedView>
        ) : null}

        {job.contact_person_name ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Contact</ThemedText>
            <ThemedText>{job.contact_person_name}</ThemedText>
            {job.contact_person_email ? (
              <ThemedText themeColor="textSecondary">{job.contact_person_email}</ThemedText>
            ) : null}
          </ThemedView>
        ) : null}

        <ThemedView style={styles.applySection}>
          {statusQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : applicationStatus?.applied ? (
            <ThemedView style={[styles.applyButton, styles.appliedButton]}>
              <FontAwesome6 name="circle-check" size={16} color="#ffffff" />
              <ThemedText type="smallBold" style={styles.applyButtonText}>
                Already Applied
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {applyError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {applyError}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={() => setCoverLetterModalVisible(true)}
                disabled={applying}
                style={[styles.applyButton, { backgroundColor: theme.primary }, applying && styles.applyButtonDisabled]}
              >
                <ThemedText type="smallBold" style={styles.applyButtonText}>
                  Apply Now
                </ThemedText>
                <FontAwesome6 name="paper-plane" size={15} color="#ffffff" />
              </Pressable>
            </>
          )}
          {applicationStatus?.applied ? (
            <ThemedView style={styles.appliedMetaRow}>
              <StatusBadge status={applicationStatus.status} />
              <ThemedText type="small" themeColor="textSecondary">
                Applied {formatRelativeTime(applicationStatus.applied_at)}
              </ThemedText>
            </ThemedView>
          ) : null}
        </ThemedView>
      </ScrollView>

      <Modal visible={coverLetterModalVisible} transparent animationType="slide" onRequestClose={() => setCoverLetterModalVisible(false)}>
        <View style={styles.backdrop}>
          <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Cover Letter</ThemedText>
              <Pressable onPress={() => setCoverLetterModalVisible(false)} hitSlop={12}>
                <FontAwesome6 name="xmark" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <ThemedText type="small" themeColor="textSecondary">
                Optional — introduce yourself and tell the recruiter why you&apos;re a great fit.
              </ThemedText>
              <TextInput
                value={coverLetter}
                onChangeText={setCoverLetter}
                placeholder="Write your cover letter..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
                style={[
                  styles.coverLetterInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                ]}
              />

              <Pressable style={styles.declarationRow} onPress={() => setDeclarationAgreed((v) => !v)}>
                <FontAwesome6
                  name={declarationAgreed ? 'square-check' : 'square'}
                  size={18}
                  color={declarationAgreed ? theme.primary : theme.textSecondary}
                />
                <ThemedText type="small" style={styles.declarationText}>
                  <ThemedText type="smallBold">Declaration*: </ThemedText>
                  I hereby declare that all the information provided in this application is true and accurate to
                  the best of my knowledge. I understand that any false information may result in disqualification
                  of my application.
                </ThemedText>
              </Pressable>

              {applyError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {applyError}
                </ThemedText>
              ) : null}

              <Button
                title="Submit Application"
                onPress={onApply}
                loading={applying}
                disabled={!declarationAgreed}
                style={styles.submitButton}
              />
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  centerMessage: { padding: 40, alignItems: 'center' },
  content: { padding: 20, gap: 20 },
  header: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleText: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  section: { gap: 6 },
  applySection: { gap: 12, marginTop: 8 },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 30,
    paddingVertical: 16,
  },
  appliedButton: {
    backgroundColor: '#22c55e',
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#ffffff',
  },
  appliedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingTop: 16 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  coverLetterInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  declarationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  declarationText: {
    flex: 1,
  },
  submitButton: { marginTop: 4 },
});
