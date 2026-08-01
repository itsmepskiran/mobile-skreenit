import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentInviteModal, type AssessmentInviteContext } from '@/components/assessment-invite-modal';
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
import { listMyJobs, searchCandidates, type CandidateSearchResult } from '@/lib/api/recruiter';

const STATUS_OPTIONS = [
  { label: 'Any status', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
];

export default function CandidateSearchScreen() {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [jrfRef, setJrfRef] = useState('');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [expMin, setExpMin] = useState('');
  const [expMax, setExpMax] = useState('');
  const [scheduleContext, setScheduleContext] = useState<ScheduleInterviewContext | null>(null);
  const [inviteContext, setInviteContext] = useState<AssessmentInviteContext | null>(null);

  const jobsQuery = useQuery({ queryKey: ['recruiter', 'jobs', 'all'], queryFn: () => listMyJobs({ pageSize: 200 }) });
  const jobOptions = useMemo(
    () => [{ label: 'Any job', value: '' }, ...(jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id }))],
    [jobsQuery.data],
  );

  const searchQuery = useQuery({
    queryKey: ['recruiter', 'candidate-search', q, jrfRef, jobId, status, expMin, expMax],
    queryFn: () =>
      searchCandidates({
        q: q.trim() || undefined,
        jrfRef: jrfRef.trim() || undefined,
        jobId: jobId || undefined,
        status: status || undefined,
        experienceMin: expMin ? Number(expMin) : undefined,
        experienceMax: expMax ? Number(expMax) : undefined,
      }),
  });
  const candidates = searchQuery.data?.data.candidates ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Candidate Search</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label="Name, Skill or Job Title"
          value={q}
          onChangeText={setQ}
          placeholder="e.g. React, John, Sales Manager"
        />
        <TextField label="JRF / Reference No" value={jrfRef} onChangeText={setJrfRef} />
        <SelectField label="Job Applied To" value={jobId} options={jobOptions} onChange={setJobId} />
        <SelectField label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <View style={styles.expRow}>
          <View style={styles.expField}>
            <TextField label="Exp Min" value={expMin} onChangeText={setExpMin} keyboardType="number-pad" />
          </View>
          <View style={styles.expField}>
            <TextField label="Exp Max" value={expMax} onChangeText={setExpMax} keyboardType="number-pad" />
          </View>
        </View>

        {searchQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : candidates.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No candidates match these filters.
          </ThemedText>
        ) : (
          candidates.map((c) => (
            <CandidateCard
              key={c.application_id}
              candidate={c}
              onSchedule={() =>
                setScheduleContext({
                  jobId: c.job_id,
                  lockJob: true,
                  candidates: [
                    { applicationId: c.application_id, candidateId: c.candidate_id, name: c.full_name, email: c.email, phone: c.phone ?? undefined },
                  ],
                })
              }
              onInvite={() => setInviteContext({ jobId: c.job_id, candidateName: c.full_name, candidateEmail: c.email })}
            />
          ))
        )}
      </ScrollView>

      <ScheduleInterviewModal
        visible={scheduleContext != null}
        context={scheduleContext}
        onClose={() => setScheduleContext(null)}
        onScheduled={() => setScheduleContext(null)}
      />
      <AssessmentInviteModal context={inviteContext} onClose={() => setInviteContext(null)} />
    </SafeAreaView>
  );
}

function CandidateCard({
  candidate,
  onSchedule,
  onInvite,
}: {
  candidate: CandidateSearchResult;
  onSchedule: () => void;
  onInvite: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">{candidate.full_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {candidate.email}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{candidate.status.replace(/_/g, ' ')}</ThemedText>
        </View>
      </View>

      {candidate.skills.length ? (
        <View style={styles.chipRow}>
          {candidate.skills.slice(0, 4).map((s) => (
            <View key={s} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{s}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        {candidate.experience_years != null ? `${candidate.experience_years} yrs exp` : 'Experience N/A'}
        {candidate.current_designation ? ` · ${candidate.current_designation}` : ''}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Applied for {candidate.job_title}
        {candidate.jrf_number ? ` · JRF ${candidate.jrf_number}` : ''}
      </ThemedText>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1, flex: 1 }]}
          onPress={() => router.push(`/(recruiter)/applications/${candidate.application_id}`)}
        >
          <FontAwesome6 name="eye" size={12} color={theme.text} />
          <ThemedText type="small">View</ThemedText>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1 }]} onPress={onSchedule}>
          <FontAwesome6 name="calendar-plus" size={12} color="#fff" />
          <ThemedText type="small" style={{ color: '#fff' }}>
            Schedule
          </ThemedText>
        </Pressable>
        <Pressable style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1, flex: 1 }]} onPress={onInvite}>
          <FontAwesome6 name="clipboard-check" size={12} color={theme.text} />
          <ThemedText type="small">Assessment</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 10 },
  expRow: { flexDirection: 'row', gap: 12 },
  expField: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 10 },
});
