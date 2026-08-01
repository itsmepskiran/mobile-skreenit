import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createInterview, type InterviewInput } from '@/lib/api/interviews';
import { listMyJobs } from '@/lib/api/recruiter';

// Ported from sql-skreenit's assets/assets/js/schedule-interview-modal.js — reused
// (per its own header comment on web) from Resume Analysis, Candidate Search, and
// Interviews Calendar, so it's built as one shared component here too rather than
// duplicated three times.
export interface ScheduleInterviewCandidate {
  applicationId?: string;
  candidateId?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface ScheduleInterviewContext {
  jobId?: string;
  lockJob?: boolean;
  candidates: ScheduleInterviewCandidate[];
}

interface Props {
  visible: boolean;
  context: ScheduleInterviewContext | null;
  onClose: () => void;
  onScheduled: () => void;
}

// Extensible list — new integrations (e.g. a future Webex/custom link) are just a new
// option here, no schema change needed since meeting_platform is a plain string column.
const MEETING_PLATFORM_OPTIONS = [
  { label: 'Google Meet', value: 'google_meet' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'Microsoft Teams', value: 'teams' },
  { label: 'Other', value: 'other' },
];

export function ScheduleInterviewModal({ visible, context, onClose, onScheduled }: Props) {
  const theme = useTheme();
  const jobsQuery = useQuery({
    queryKey: ['recruiter', 'jobs', 'all'],
    queryFn: () => listMyJobs({ pageSize: 200 }),
    enabled: visible,
  });
  const jobOptions = useMemo(
    () => (jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id })),
    [jobsQuery.data],
  );

  const [jobId, setJobId] = useState(context?.jobId ?? '');
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionDraft, setQuestionDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setJobId(context?.jobId ?? '');
    setScheduledAt(new Date());
    setDurationMinutes('30');
    setInterviewerName('');
    setInterviewerEmail('');
    setMeetingLink('');
    setMeetingPlatform('');
    setLocation('');
    setNotes('');
    setQuestions([]);
    setQuestionDraft('');
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const addQuestion = () => {
    const trimmed = questionDraft.trim();
    if (!trimmed) return;
    setQuestions((prev) => [...prev, trimmed]);
    setQuestionDraft('');
  };

  const submit = async () => {
    if (!jobId) {
      setError('Please select a job.');
      return;
    }
    if (!context?.candidates.length) {
      setError('No candidate to schedule.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        context.candidates.map((candidate) => {
          const input: InterviewInput = {
            jobId,
            applicationId: candidate.applicationId,
            candidateId: candidate.candidateId,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            candidatePhone: candidate.phone,
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes: Number(durationMinutes) || 30,
            interviewerName: interviewerName.trim() || undefined,
            interviewerEmail: interviewerEmail.trim() || undefined,
            meetingLink: meetingLink.trim() || undefined,
            meetingPlatform: meetingPlatform || undefined,
            location: location.trim() || undefined,
            notes: notes.trim() || undefined,
            questions,
          };
          return createInterview(input);
        }),
      );
      reset();
      onScheduled();
    } catch {
      setError('Could not schedule the interview. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!context) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Schedule Interview</ThemedText>
            <Pressable onPress={close} hitSlop={12}>
              <FontAwesome6 name="xmark" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              {context.candidates.length === 1
                ? `Candidate: ${context.candidates[0].name}`
                : `${context.candidates.length} candidates selected`}
            </ThemedText>

            <SelectField
              label="Job Post"
              value={jobId}
              options={jobOptions}
              placeholder="Select a job..."
              disabled={context.lockJob}
              onChange={setJobId}
            />

            <ThemedText type="smallBold">Date</ThemedText>
            <Pressable
              style={[styles.pickerRow, { borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText type="small">{scheduledAt.toLocaleDateString()}</ThemedText>
              <FontAwesome6 name="calendar" size={14} color={theme.textSecondary} />
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={scheduledAt}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    const next = new Date(scheduledAt);
                    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setScheduledAt(next);
                  }
                }}
              />
            ) : null}

            <ThemedText type="smallBold">Time</ThemedText>
            <Pressable
              style={[styles.pickerRow, { borderColor: theme.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <ThemedText type="small">
                {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
              <FontAwesome6 name="clock" size={14} color={theme.textSecondary} />
            </Pressable>
            {showTimePicker ? (
              <DateTimePicker
                value={scheduledAt}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (date) {
                    const next = new Date(scheduledAt);
                    next.setHours(date.getHours(), date.getMinutes());
                    setScheduledAt(next);
                  }
                }}
              />
            ) : null}

            <TextField
              label="Duration (minutes)"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="number-pad"
            />
            <TextField label="Interviewer Name" value={interviewerName} onChangeText={setInterviewerName} />
            <TextField
              label="Interviewer Email"
              value={interviewerEmail}
              onChangeText={setInterviewerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField label="Meeting Link" value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" />
            <SelectField
              label="Meeting Platform"
              value={meetingPlatform}
              options={MEETING_PLATFORM_OPTIONS}
              placeholder="Select..."
              onChange={setMeetingPlatform}
            />
            <TextField label="Location" value={location} onChangeText={setLocation} />

            <ThemedText type="smallBold">Interview Questions (optional)</ThemedText>
            {questions.map((q, index) => (
              <View key={`${q}-${index}`} style={[styles.questionRow, { borderColor: theme.border }]}>
                <ThemedText type="small" style={styles.questionText}>
                  {q}
                </ThemedText>
                <Pressable onPress={() => setQuestions((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                  <FontAwesome6 name="trash" size={13} color={theme.danger} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addQuestionRow}>
              <View style={{ flex: 1 }}>
                <TextField label="" placeholder="Add a question" value={questionDraft} onChangeText={setQuestionDraft} />
              </View>
              <Pressable style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={addQuestion}>
                <FontAwesome6 name="plus" size={14} color="#fff" />
              </Pressable>
            </View>

            <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}

            <Button title="Schedule Interview" onPress={submit} loading={submitting} style={styles.submitButton} />
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  questionText: { flex: 1 },
  addQuestionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  addButton: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  submitButton: { marginTop: 12 },
});
