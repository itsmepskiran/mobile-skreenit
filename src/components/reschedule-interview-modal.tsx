import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateInterview, type Interview } from '@/lib/api/interviews';

const MEETING_PLATFORM_OPTIONS = [
  { label: 'Google Meet', value: 'google_meet' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'Microsoft Teams', value: 'teams' },
  { label: 'Other', value: 'other' },
];

// Edits an already-scheduled interview in place (date/time/interviewer/meeting
// details) via PUT /recruiter/interviews/{id} — unlike ScheduleInterviewModal,
// there's no job/candidate picker here since those don't change on a reschedule.
// Server-side, supplying scheduledAt flips the interview's status to
// 'rescheduled' automatically (see routers/interviews.py update_interview).
interface Props {
  interview: Interview | null;
  onClose: () => void;
  onRescheduled: () => void;
}

export function RescheduleInterviewModal({ interview, onClose, onRescheduled }: Props) {
  const theme = useTheme();
  const visible = interview != null;

  const [scheduledAt, setScheduledAt] = useState<Date>(() => (interview ? new Date(interview.scheduled_at) : new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(String(interview?.duration_minutes ?? 30));
  const [interviewerName, setInterviewerName] = useState(interview?.interviewer_name ?? '');
  const [interviewerEmail, setInterviewerEmail] = useState(interview?.interviewer_email ?? '');
  const [meetingLink, setMeetingLink] = useState(interview?.meeting_link ?? '');
  const [meetingPlatform, setMeetingPlatform] = useState(interview?.meeting_platform ?? '');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [notes, setNotes] = useState(interview?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync local form state whenever a different interview is opened for editing.
  const [loadedInterviewId, setLoadedInterviewId] = useState<string | null>(null);
  if (interview && interview.id !== loadedInterviewId) {
    setLoadedInterviewId(interview.id);
    setScheduledAt(new Date(interview.scheduled_at));
    setDurationMinutes(String(interview.duration_minutes));
    setInterviewerName(interview.interviewer_name ?? '');
    setInterviewerEmail(interview.interviewer_email ?? '');
    setMeetingLink(interview.meeting_link ?? '');
    setMeetingPlatform(interview.meeting_platform ?? '');
    setLocation(interview.location ?? '');
    setNotes(interview.notes ?? '');
    setError(null);
  }

  const close = () => {
    setLoadedInterviewId(null);
    onClose();
  };

  const submit = async () => {
    if (!interview) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateInterview(interview.id, {
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: Number(durationMinutes) || 30,
        interviewerName: interviewerName.trim() || undefined,
        interviewerEmail: interviewerEmail.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        meetingPlatform: meetingPlatform || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setLoadedInterviewId(null);
      onRescheduled();
    } catch {
      setError('Could not reschedule the interview. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!interview) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Reschedule Interview</ThemedText>
            <Pressable onPress={close} hitSlop={12}>
              <FontAwesome6 name="xmark" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              Candidate: {interview.candidate_name}
            </ThemedText>

            <ThemedText type="smallBold">Date</ThemedText>
            <Pressable style={[styles.pickerRow, { borderColor: theme.border }]} onPress={() => setShowDatePicker(true)}>
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
            <Pressable style={[styles.pickerRow, { borderColor: theme.border }]} onPress={() => setShowTimePicker(true)}>
              <ThemedText type="small">{scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
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

            <TextField label="Duration (minutes)" value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />
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
            <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}

            <Button title="Save Changes" onPress={submit} loading={submitting} style={styles.submitButton} />
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
  submitButton: { marginTop: 12 },
});
