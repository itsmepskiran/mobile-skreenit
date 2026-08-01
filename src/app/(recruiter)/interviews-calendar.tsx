import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CandidateProfileModal } from '@/components/candidate-profile-modal';
import { RescheduleInterviewModal } from '@/components/reschedule-interview-modal';
import {
  ScheduleInterviewModal,
  type ScheduleInterviewContext,
} from '@/components/schedule-interview-modal';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cancelInterview, listInterviews, type Interview } from '@/lib/api/interviews';
import { listMyJobs, searchCandidates, type CandidateSearchResult } from '@/lib/api/recruiter';

const STATUS_COLOR: Record<string, string> = {
  cancelled: '#c53030',
  completed: '#2f855a',
  scheduled: '#2b6cb0',
  rescheduled: '#c05621',
  no_show: '#718096',
};

// Removed the month-grid calendar in favor of a job-filtered candidate list — a
// recruiter picks the job they're hiring for, sees everyone who applied, and can
// view a full profile or jump straight to scheduling from that row. Scheduled
// interviews for the selected job are still listed (and cancellable) below, just
// as a plain list instead of a calendar. Ported layout from sql-skreenit's
// reworked dashboard/js/interviews-calendar.js.
export default function InterviewsCalendarScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState('');
  const [search, setSearch] = useState('');
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [scheduleContext, setScheduleContext] = useState<ScheduleInterviewContext | null>(null);
  const [profileCandidateId, setProfileCandidateId] = useState<string | null>(null);
  const [viewInterview, setViewInterview] = useState<Interview | null>(null);
  const [rescheduleInterview, setRescheduleInterview] = useState<Interview | null>(null);

  const jobsQuery = useQuery({ queryKey: ['recruiter', 'jobs', 'all'], queryFn: () => listMyJobs({ pageSize: 200 }) });
  const jobOptions = useMemo(
    () => (jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id })),
    [jobsQuery.data],
  );

  const candidatesQuery = useQuery({
    queryKey: ['recruiter', 'candidates', jobId, search],
    queryFn: () => searchCandidates({ jobId, q: search || undefined }),
    enabled: !!jobId,
  });
  const candidates = candidatesQuery.data?.data.candidates ?? [];

  const interviewsQuery = useQuery({
    queryKey: ['recruiter', 'interviews', jobId],
    queryFn: () => listInterviews({ jobId: jobId || undefined }),
    enabled: !!jobId,
  });
  const interviews = interviewsQuery.data?.data.interviews ?? [];

  const cancelMutation = useMutation({
    mutationFn: cancelInterview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'interviews'] }),
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Interview Schedules</ThemedText>
        <Pressable
          style={[styles.newButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setNewName('');
            setNewEmail('');
            setNewInterviewOpen(true);
          }}
        >
          <FontAwesome6 name="plus" size={13} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Job"
              value={jobId}
              options={jobOptions}
              placeholder="Select a job to see candidates"
              onChange={setJobId}
            />
          </View>
        </View>

        {jobId ? (
          <TextField label="Search" placeholder="Search candidate name or email" value={search} onChangeText={setSearch} />
        ) : null}

        {!jobId ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Select a job above to see its candidates.
          </ThemedText>
        ) : candidatesQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : candidates.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No candidates found for this job.
          </ThemedText>
        ) : (
          <View style={styles.section}>
            <ThemedText type="smallBold">Candidates</ThemedText>
            {candidates.map((c) => (
              <CandidateRow
                key={c.application_id}
                candidate={c}
                onViewProfile={() => setProfileCandidateId(c.candidate_id)}
                onSchedule={() =>
                  setScheduleContext({
                    jobId: c.job_id,
                    lockJob: true,
                    candidates: [{ applicationId: c.application_id, candidateId: c.candidate_id, name: c.full_name, email: c.email }],
                  })
                }
              />
            ))}
          </View>
        )}

        {jobId && interviews.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Scheduled Interviews for this Job</ThemedText>
            {interviews.map((iv) => (
              <ThemedView key={iv.id} style={[styles.interviewCard, { borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold">{iv.candidate_name}</ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[iv.status] ?? theme.primary}22` }]}>
                    <ThemedText type="small" style={{ color: STATUS_COLOR[iv.status] ?? theme.primary }}>
                      {iv.status.replace(/_/g, ' ')}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(iv.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                  {iv.duration_minutes} min{iv.meeting_platform ? ` · ${iv.meeting_platform.replace(/_/g, ' ')}` : ''}
                </ThemedText>
                <View style={styles.interviewActionsRow}>
                  <Pressable style={[styles.viewButton, { borderColor: theme.border }]} onPress={() => setViewInterview(iv)}>
                    <FontAwesome6 name="eye" size={12} color={theme.text} />
                    <ThemedText type="small">View</ThemedText>
                  </Pressable>
                  {iv.status !== 'cancelled' && iv.status !== 'completed' ? (
                    <Pressable style={[styles.cancelButton, { borderColor: theme.danger }]} onPress={() => cancelMutation.mutate(iv.id)}>
                      <ThemedText type="small" style={{ color: theme.danger }}>
                        Cancel Interview
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </ThemedView>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={newInterviewOpen} transparent animationType="fade" onRequestClose={() => setNewInterviewOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNewInterviewOpen(false)}>
          <Pressable style={[styles.newInterviewCard, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="subtitle">New Interview</ThemedText>
            <TextField label="Candidate Name" value={newName} onChangeText={setNewName} />
            <TextField label="Candidate Email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" />
            <Pressable
              style={[styles.continueButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (!newName.trim()) return;
                setNewInterviewOpen(false);
                setScheduleContext({ jobId: jobId || undefined, candidates: [{ name: newName.trim(), email: newEmail.trim() || undefined }] });
              }}
            >
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Continue
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ScheduleInterviewModal
        visible={scheduleContext != null}
        context={scheduleContext}
        onClose={() => setScheduleContext(null)}
        onScheduled={() => {
          setScheduleContext(null);
          queryClient.invalidateQueries({ queryKey: ['recruiter', 'interviews'] });
        }}
      />

      <CandidateProfileModal candidateId={profileCandidateId} onClose={() => setProfileCandidateId(null)} />

      <Modal visible={viewInterview != null} transparent animationType="fade" onRequestClose={() => setViewInterview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setViewInterview(null)}>
          <Pressable style={[styles.detailCard, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            {viewInterview ? (
              <>
                <View style={styles.detailHeader}>
                  <ThemedText type="subtitle">Interview Details</ThemedText>
                  <Pressable onPress={() => setViewInterview(null)} hitSlop={12}>
                    <FontAwesome6 name="xmark" size={18} color={theme.text} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={styles.detailBody}>
                  <DetailRow label="Candidate" value={`${viewInterview.candidate_name}${viewInterview.candidate_email ? ` (${viewInterview.candidate_email})` : ''}`} />
                  <DetailRow
                    label="Date & Time"
                    value={new Date(viewInterview.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  />
                  <DetailRow label="Duration" value={`${viewInterview.duration_minutes} minutes`} />
                  {viewInterview.interviewer_name ? (
                    <DetailRow
                      label="Interviewer"
                      value={`${viewInterview.interviewer_name}${viewInterview.interviewer_email ? ` (${viewInterview.interviewer_email})` : ''}`}
                    />
                  ) : null}
                  {viewInterview.meeting_platform ? (
                    <DetailRow label="Platform" value={viewInterview.meeting_platform.replace(/_/g, ' ')} />
                  ) : null}
                  {viewInterview.meeting_link ? (
                    <Pressable onPress={() => Linking.openURL(viewInterview.meeting_link as string)}>
                      <DetailRow label="Meeting Link" value={viewInterview.meeting_link} valueColor={theme.primary} />
                    </Pressable>
                  ) : null}
                  {viewInterview.location ? <DetailRow label="Location" value={viewInterview.location} /> : null}
                  <DetailRow label="Status" value={viewInterview.status.replace(/_/g, ' ')} />
                  {viewInterview.notes ? <DetailRow label="Notes" value={viewInterview.notes} /> : null}
                  {viewInterview.questions.length > 0 ? (
                    <View style={{ gap: 4 }}>
                      <ThemedText type="smallBold">Interview Questions</ThemedText>
                      {viewInterview.questions.map((q, i) => (
                        <ThemedText key={i} type="small" themeColor="textSecondary">
                          {i + 1}. {q}
                        </ThemedText>
                      ))}
                    </View>
                  ) : null}
                  {viewInterview.status !== 'cancelled' && viewInterview.status !== 'completed' ? (
                    <Pressable
                      style={[styles.rescheduleButton, { borderColor: theme.primary }]}
                      onPress={() => {
                        const iv = viewInterview;
                        setViewInterview(null);
                        setRescheduleInterview(iv);
                      }}
                    >
                      <FontAwesome6 name="rotate" size={13} color={theme.primary} />
                      <ThemedText type="smallBold" themeColor="primary">
                        Reschedule
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <RescheduleInterviewModal
        interview={rescheduleInterview}
        onClose={() => setRescheduleInterview(null)}
        onRescheduled={() => {
          setRescheduleInterview(null);
          queryClient.invalidateQueries({ queryKey: ['recruiter', 'interviews'] });
        }}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="small" themeColor={valueColor ? undefined : 'textSecondary'} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}

function CandidateRow({
  candidate,
  onViewProfile,
  onSchedule,
}: {
  candidate: CandidateSearchResult;
  onViewProfile: () => void;
  onSchedule: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.candidateCard, { borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{candidate.full_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {candidate.email}
        </ThemedText>
        {candidate.skills.length > 0 ? (
          <View style={styles.skillsRow}>
            {candidate.skills.slice(0, 3).map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <ThemedText type="small" themeColor="primary">
                  {skill}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.candidateActions}>
        <Pressable style={[styles.actionButton, { borderColor: theme.border }]} onPress={onViewProfile}>
          <FontAwesome6 name="id-card" size={13} color={theme.text} />
          <ThemedText type="small">View Profile</ThemedText>
        </Pressable>
        <Pressable style={[styles.actionButton, { borderColor: theme.primary }]} onPress={onSchedule}>
          <FontAwesome6 name="calendar-check" size={13} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            Schedule Interview
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  newButton: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 12 },
  filterRow: { flexDirection: 'row', gap: 12 },
  empty: { textAlign: 'center', marginTop: 24 },
  section: { gap: 10, marginTop: 8 },
  candidateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: Radius.lg, padding: 14 },
  candidateActions: { gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  skillChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(79,70,229,0.1)' },
  interviewCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  interviewActionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButton: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 8, alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  newInterviewCard: { width: '100%', maxWidth: 360, borderRadius: Radius.lg, padding: 20, gap: 12 },
  continueButton: { borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  detailCard: { width: '100%', maxWidth: 420, maxHeight: '80%', borderRadius: Radius.lg, padding: 20 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  detailBody: { gap: 12 },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    marginTop: 8,
  },
});
