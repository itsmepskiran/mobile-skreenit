import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { listMyJobs } from '@/lib/api/recruiter';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STATUS_COLOR: Record<string, string> = {
  cancelled: '#c53030',
  completed: '#2f855a',
  scheduled: '#2b6cb0',
  rescheduled: '#c05621',
  no_show: '#718096',
};

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = new Array(firstDay.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function InterviewsCalendarScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [scheduleContext, setScheduleContext] = useState<ScheduleInterviewContext | null>(null);

  const jobsQuery = useQuery({ queryKey: ['recruiter', 'jobs', 'all'], queryFn: () => listMyJobs({ pageSize: 200 }) });
  const jobOptions = useMemo(
    () => [{ label: 'All jobs', value: '' }, ...(jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id }))],
    [jobsQuery.data],
  );

  const interviewsQuery = useQuery({
    queryKey: ['recruiter', 'interviews', jobId, status],
    queryFn: () => listInterviews({ jobId: jobId || undefined, status: status || undefined }),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Interview[]>();
    (interviewsQuery.data?.data.interviews ?? []).forEach((iv) => {
      const key = new Date(iv.scheduled_at).toDateString();
      map.set(key, [...(map.get(key) ?? []), iv]);
    });
    return map;
  }, [interviewsQuery.data]);

  const cancelMutation = useMutation({
    mutationFn: cancelInterview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'interviews'] }),
  });

  const grid = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const monthLabel = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const selectedInterviews = selectedDate ? (byDate.get(selectedDate.toDateString()) ?? []) : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/dashboard')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Interviews Calendar</ThemedText>
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
            <SelectField label="Job" value={jobId} options={jobOptions} onChange={setJobId} />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Status"
              value={status}
              options={[
                { label: 'All statuses', value: '' },
                { label: 'Scheduled', value: 'scheduled' },
                { label: 'Rescheduled', value: 'rescheduled' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'No Show', value: 'no_show' },
              ]}
              onChange={setStatus}
            />
          </View>
        </View>

        <View style={styles.monthNavRow}>
          <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} hitSlop={10}>
            <FontAwesome6 name="chevron-left" size={14} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{monthLabel}</ThemedText>
          <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} hitSlop={10}>
            <FontAwesome6 name="chevron-right" size={14} color={theme.text} />
          </Pressable>
        </View>

        {interviewsQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.weekdayCell}>
                  {w}
                </ThemedText>
              ))}
            </View>
            <View style={styles.grid}>
              {grid.map((date, i) => {
                if (!date) return <View key={i} style={styles.dayCell} />;
                const dayInterviews = byDate.get(date.toDateString()) ?? [];
                const isSelected = selectedDate && sameDay(selectedDate, date);
                const isToday = sameDay(date, new Date());
                return (
                  <Pressable
                    key={i}
                    style={[
                      styles.dayCell,
                      { borderColor: theme.border },
                      isSelected && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: isSelected ? '#fff' : isToday ? theme.primary : theme.text, fontWeight: isToday ? '700' : '400' }}
                    >
                      {date.getDate()}
                    </ThemedText>
                    {dayInterviews.slice(0, 2).map((iv) => (
                      <View
                        key={iv.id}
                        style={[styles.eventDot, { backgroundColor: isSelected ? '#fff' : STATUS_COLOR[iv.status] ?? theme.primary }]}
                      />
                    ))}
                    {dayInterviews.length > 2 ? (
                      <ThemedText type="small" style={{ color: isSelected ? '#fff' : theme.textSecondary, fontSize: 9 }}>
                        +{dayInterviews.length - 2}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {selectedDate ? (
              <View style={styles.detailsSection}>
                <ThemedText type="subtitle">{selectedDate.toDateString()}</ThemedText>
                {selectedInterviews.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No interviews on this day.
                  </ThemedText>
                ) : (
                  selectedInterviews.map((iv) => (
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
                        {new Date(iv.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {iv.duration_minutes} min
                      </ThemedText>
                      {iv.interviewer_name ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Interviewer: {iv.interviewer_name}
                        </ThemedText>
                      ) : null}
                      {iv.meeting_link ? (
                        <ThemedText type="small" themeColor="primary">
                          {iv.meeting_link}
                        </ThemedText>
                      ) : null}
                      {iv.location ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {iv.location}
                        </ThemedText>
                      ) : null}
                      {iv.status !== 'cancelled' && iv.status !== 'completed' ? (
                        <Pressable
                          style={[styles.cancelButton, { borderColor: theme.danger }]}
                          onPress={() => cancelMutation.mutate(iv.id)}
                        >
                          <ThemedText type="small" style={{ color: theme.danger }}>
                            Cancel Interview
                          </ThemedText>
                        </Pressable>
                      ) : null}
                    </ThemedView>
                  ))
                )}
              </View>
            ) : null}
          </>
        )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  newButton: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 12 },
  filterRow: { flexDirection: 'row', gap: 12 },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  weekdayRow: { flexDirection: 'row' },
  weekdayCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 6 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  detailsSection: { gap: 10, marginTop: 8 },
  interviewCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  cancelButton: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 8, alignItems: 'center', marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  newInterviewCard: { width: '100%', maxWidth: 360, borderRadius: Radius.lg, padding: 20, gap: 12 },
  continueButton: { borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
});
